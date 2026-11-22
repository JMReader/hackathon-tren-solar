from __future__ import annotations

import base64
import hashlib
import hmac
import re
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote, urlencode

import httpx2

from .models import Connection, OutcomeKind, Platform, ProviderOutcome, Publication, PublishableDraft, PublishableMedia
from .ports import OAuthError, ProviderReadError

AUTHORIZATION_URL = "https://x.com/i/oauth2/authorize"
API_URL = "https://api.x.com"
TOKEN_URL = f"{API_URL}/2/oauth2/token"
SCOPES = ("tweet.read", "tweet.write", "users.read", "media.write", "offline.access")
MAX_WEIGHTED_LENGTH = 280
MAX_IMAGE_BYTES = 5 * 1024 * 1024
URL_PATTERN = re.compile(
    r"(?i)\b(?:https?://|www\.)\S+"
    r"|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|dev|app|ar|co|ai|me|ly|gg|xyz|info|edu|gov)\b"
)
TCO_LINK = re.compile(r"\s*https://t\.co/\w+")
MAX_READ_POSTS = 20
IMAGE_UPLOAD_FAILED = ProviderOutcome.rejected(
    "IMAGE_UPLOAD_FAILED", "No pudimos subir la foto a X. No se publicó nada; podés reintentar.", True
)


@dataclass(frozen=True)
class XConfig:
    client_id: str
    client_secret: str = field(repr=False)
    redirect_uri: str
    allow_links: bool = False


def post_url(post_id: str, handle: str | None) -> str:
    return f"https://x.com/{handle.lstrip('@') if handle else 'i/web'}/status/{post_id}"


def weighted_length(text: str) -> int:
    return sum(1 if _light(ord(char)) else 2 for char in unicodedata.normalize("NFC", text))


def _light(code_point: int) -> bool:
    return code_point <= 4351 or 8192 <= code_point <= 8205 or 8208 <= code_point <= 8223 or 8242 <= code_point <= 8247


class XAdapter:
    platform = Platform.X
    required_scopes = frozenset({"tweet.read", "tweet.write", "users.read", "media.write"})
    supports_image = True
    supports_read_posts = True

    def __init__(
        self,
        config: XConfig,
        http: httpx2.Client,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._config = config
        self._http = http
        self._clock = clock

    def access_unavailable(self) -> None:
        return None

    def authorization_url(self, state: str) -> str:
        challenge = _b64url(hashlib.sha256(self._code_verifier(state).encode()).digest())
        query = urlencode(
            {
                "response_type": "code",
                "client_id": self._config.client_id,
                "redirect_uri": self._config.redirect_uri,
                "scope": " ".join(SCOPES),
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            },
            quote_via=quote,
        )
        return f"{AUTHORIZATION_URL}?{query}"

    def complete(self, code: str, state: str | None = None) -> Connection:
        payload = self._token(
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self._config.redirect_uri,
                "code_verifier": self._code_verifier(state or ""),
            }
        )
        access_token = payload["access_token"]
        try:
            me = self._http.get(f"{API_URL}/2/users/me", headers={"Authorization": f"Bearer {access_token}"})
        except httpx2.HTTPError as error:
            raise OAuthError("userinfo_unreachable") from error
        if me.status_code != 200:
            raise OAuthError(f"userinfo_http_{me.status_code}")
        user = me.json()["data"]
        return Connection(
            platform=self.platform,
            access_token=access_token,
            scopes=frozenset(payload.get("scope", "").split()),
            expires_at=self._expires_at(payload),
            account_id=user["id"],
            account_handle=f"@{user['username']}",
            refresh_token=payload.get("refresh_token"),
        )

    def refresh(self, connection: Connection) -> Connection:
        if not connection.refresh_token:
            raise OAuthError("missing_refresh_token")
        payload = self._token({"grant_type": "refresh_token", "refresh_token": connection.refresh_token})
        return replace(
            connection,
            access_token=payload["access_token"],
            scopes=frozenset(payload["scope"].split()) if payload.get("scope") else connection.scopes,
            expires_at=self._expires_at(payload),
            refresh_token=payload.get("refresh_token") or connection.refresh_token,
        )

    def read_recent_posts(self, connection: Connection, limit: int) -> list[str]:
        limit = max(1, min(limit, MAX_READ_POSTS))
        try:
            response = self._http.get(
                f"{API_URL}/2/users/{connection.account_id}/tweets",
                params={
                    "max_results": max(5, min(100, limit * 2)),
                    "exclude": "replies,retweets",
                    "tweet.fields": "note_tweet",
                },
                headers=_bearer(connection),
            )
        except httpx2.HTTPError as error:
            raise ProviderReadError(
                "PROVIDER_UNREACHABLE", "No pudimos conectar con X para leer tus posts.", True
            ) from error
        if response.status_code != 200:
            raise _read_error(response)
        posts = []
        for item in _json(response).get("data") or []:
            text = TCO_LINK.sub("", (item.get("note_tweet") or {}).get("text") or item.get("text") or "").strip()
            if text:
                posts.append(text)
        return posts[:limit]

    def publish(self, connection: Connection, draft: PublishableDraft) -> ProviderOutcome:
        if not self._config.allow_links and URL_PATTERN.search(draft.body):
            return ProviderOutcome.rejected(
                "LINKS_NOT_ALLOWED",
                "X cobra mucho más por los posts con links. Quitá el link del texto y volvé a intentar.",
                True,
            )
        if weighted_length(draft.body) > MAX_WEIGHTED_LENGTH:
            return ProviderOutcome.rejected(
                "TEXT_TOO_LONG", "El texto supera los 280 caracteres que admite X. Acortalo y volvé a intentar.", True
            )
        body: dict[str, object] = {"text": draft.body}
        if draft.media:
            media_id = self._upload_image(connection, draft.media)
            if isinstance(media_id, ProviderOutcome):
                return media_id
            body["media"] = {"media_ids": [media_id]}

        try:
            response = self._http.post(f"{API_URL}/2/tweets", json=body, headers=_bearer(connection))
        except (httpx2.ConnectError, httpx2.ConnectTimeout):
            return ProviderOutcome.rejected(
                "PROVIDER_UNREACHABLE", "No pudimos conectar con X. No se publicó nada; podés reintentar.", True
            )
        except httpx2.TimeoutException:
            return ProviderOutcome.unknown(
                "PROVIDER_TIMEOUT_AFTER_SEND",
                "X no confirmó a tiempo. Verificá en tu perfil antes de reintentar para no duplicar.",
            )
        if response.status_code == 201:
            post_id = (_json(response).get("data") or {}).get("id")
            return ProviderOutcome.succeeded(post_id, post_url(post_id, connection.account_handle) if post_id else None)
        return _rejection(response)

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None:
        return None

    def _upload_image(self, connection: Connection, media: PublishableMedia) -> str | ProviderOutcome:
        try:
            path = Path(media.local_path)
            if path.stat().st_size > MAX_IMAGE_BYTES:
                return ProviderOutcome.rejected(
                    "IMAGE_TOO_LARGE", "X admite fotos de hasta 5 MB. Usá una foto más liviana.", True
                )
            response = self._http.post(
                f"{API_URL}/2/media/upload",
                data={"media_category": "tweet_image"},
                files={"media": (path.name, path.read_bytes(), media.mime_type)},
                headers=_bearer(connection),
            )
        except (httpx2.HTTPError, OSError):
            return IMAGE_UPLOAD_FAILED
        if response.status_code not in (200, 201):
            failure = _rejection(response)
            return failure if failure.kind is OutcomeKind.REJECTED else IMAGE_UPLOAD_FAILED
        media_id = (_json(response).get("data") or {}).get("id")
        if not media_id:
            return IMAGE_UPLOAD_FAILED
        if media.alt_text:
            try:
                self._http.post(
                    f"{API_URL}/2/media/metadata",
                    json={"id": media_id, "metadata": {"alt_text": {"text": media.alt_text[:1000]}}},
                    headers=_bearer(connection),
                )
            except httpx2.HTTPError:
                pass
        return media_id

    def _token(self, data: dict[str, str]) -> dict:
        try:
            response = self._http.post(
                TOKEN_URL,
                data=data | {"client_id": self._config.client_id},
                auth=(self._config.client_id, self._config.client_secret),
            )
        except httpx2.HTTPError as error:
            raise OAuthError("token_unreachable") from error
        if response.status_code != 200:
            raise OAuthError(_json(response).get("error") or f"token_http_{response.status_code}")
        return response.json()

    def _code_verifier(self, state: str) -> str:
        key = self._config.client_secret.encode()
        return _b64url(hmac.new(key, state.encode(), hashlib.sha256).digest())

    def _expires_at(self, payload: dict) -> datetime:
        return self._clock() + timedelta(seconds=int(payload.get("expires_in", 7200)))


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _bearer(connection: Connection) -> dict[str, str]:
    return {"Authorization": f"Bearer {connection.access_token}"}


def _json(response: httpx2.Response) -> dict:
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _problem(response: httpx2.Response) -> str:
    payload = _json(response)
    errors = payload.get("errors") if isinstance(payload.get("errors"), list) else []
    parts = [payload.get("title"), payload.get("detail"), *(e.get("message") for e in errors if isinstance(e, dict))]
    return " ".join(str(part) for part in parts if part)[:300]


def _rejection(response: httpx2.Response) -> ProviderOutcome:
    status = response.status_code
    problem = _problem(response)
    lowered = problem.lower()
    if status == 401:
        return ProviderOutcome.rejected(
            "OAUTH_TOKEN_EXPIRED",
            "La sesión de X venció. Reconectá tu cuenta o copiá el texto para publicarlo manualmente.",
            True,
        )
    if status == 402 or (status == 403 and "spend cap" in lowered):
        return ProviderOutcome.rejected(
            "PROVIDER_CREDITS_EXHAUSTED",
            "La cuenta de desarrollador de X se quedó sin créditos. No se publicó nada; recargá y reintentá.",
            True,
        )
    if status == 403 and "duplicate" in lowered:
        return ProviderOutcome.rejected(
            "DUPLICATE_CONTENT",
            "X ya tiene un post idéntico en tu cuenta. Revisá tu perfil; para publicar otra vez, cambiá el texto.",
            False,
        )
    if status == 403:
        return ProviderOutcome.rejected(
            "PERMISSION_DENIED", f"X no permitió publicar con esta cuenta. {problem}".strip(), False
        )
    if status == 429:
        return ProviderOutcome.rejected("RATE_LIMITED", "X pidió esperar. Probá de nuevo en unos minutos.", True)
    if status in (400, 422):
        return ProviderOutcome.rejected("CONTENT_REJECTED", f"X rechazó el contenido. {problem}".strip(), False)
    return ProviderOutcome.unknown(
        "PROVIDER_ERROR_AFTER_SEND",
        f"X respondió con un error ({status}). Verificá en tu perfil antes de reintentar para no duplicar.",
    )


def _read_error(response: httpx2.Response) -> ProviderReadError:
    status = response.status_code
    if status == 401:
        return ProviderReadError("OAUTH_TOKEN_EXPIRED", "La sesión de X venció. Reconectá tu cuenta.", True)
    if status in (402, 403):
        return ProviderReadError(
            "READ_UNAVAILABLE",
            f"X no habilitó la lectura de posts para esta app (créditos o permisos). {_problem(response)}".strip(),
            False,
        )
    if status == 429:
        return ProviderReadError("RATE_LIMITED", "X pidió esperar antes de leer más posts.", True)
    return ProviderReadError("PROVIDER_ERROR", f"X respondió con un error ({status}) al leer tus posts.", True)

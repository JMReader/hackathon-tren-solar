from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote, urlencode

import httpx2

from .apify import ApifyLinkedInPosts
from .little import to_little
from .models import Connection, Platform, ProviderOutcome, Publication, PublishableDraft, PublishableMedia
from .ports import OAuthError, ProviderReadError

AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
API_URL = "https://api.linkedin.com"
SCOPES = ("openid", "profile", "w_member_social")
DEFAULT_API_VERSION = "202610"


@dataclass(frozen=True)
class LinkedInConfig:
    client_id: str
    client_secret: str = field(repr=False)
    redirect_uri: str
    api_version: str = DEFAULT_API_VERSION


def post_url(urn: str) -> str:
    return f"https://www.linkedin.com/feed/update/{urn}/"


class LinkedInAdapter:
    platform = Platform.LINKEDIN
    required_scopes = frozenset({"w_member_social"})
    supports_image = True

    def __init__(
        self,
        config: LinkedInConfig,
        http: httpx2.Client,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        posts: ApifyLinkedInPosts | None = None,
    ) -> None:
        self._config = config
        self._http = http
        self._clock = clock
        self._posts = posts
        self.supports_read_posts = posts is not None

    def access_unavailable(self) -> None:
        return None

    def authorization_url(self, state: str) -> str:
        query = urlencode(
            {
                "response_type": "code",
                "client_id": self._config.client_id,
                "redirect_uri": self._config.redirect_uri,
                "state": state,
                "scope": " ".join(SCOPES),
            },
            quote_via=quote,
        )
        return f"{AUTHORIZATION_URL}?{query}"

    def complete(self, code: str, state: str | None = None) -> Connection:
        token = self._http.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self._config.redirect_uri,
                "client_id": self._config.client_id,
                "client_secret": self._config.client_secret,
            },
        )
        if token.status_code != 200:
            raise OAuthError(_json(token).get("error") or f"token_http_{token.status_code}")
        payload = token.json()
        access_token = payload["access_token"]
        userinfo = self._http.get(f"{API_URL}/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        if userinfo.status_code != 200:
            raise OAuthError(f"userinfo_http_{userinfo.status_code}")
        profile = userinfo.json()
        return Connection(
            platform=self.platform,
            access_token=access_token,
            scopes=frozenset(filter(None, re.split(r"[\s,]+", payload.get("scope", "")))),
            expires_at=self._clock() + timedelta(seconds=int(payload["expires_in"])),
            account_id=profile["sub"],
            account_handle=profile.get("name"),
        )

    def publish(self, connection: Connection, draft: PublishableDraft) -> ProviderOutcome:
        author = f"urn:li:person:{connection.account_id}"
        body: dict[str, object] = {
            "author": author,
            "commentary": to_little(draft.body),
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }
        if draft.media:
            try:
                image = self._upload_image(connection, author, draft.media)
            except (httpx2.HTTPError, OSError, KeyError, ValueError):
                return ProviderOutcome.rejected(
                    "IMAGE_UPLOAD_FAILED",
                    "No pudimos subir la foto a LinkedIn. No se publicó nada; podés reintentar.",
                    True,
                )
            media = {"id": image, "altText": draft.media.alt_text} if draft.media.alt_text else {"id": image}
            body["content"] = {"media": media}

        try:
            response = self._http.post(f"{API_URL}/rest/posts", json=body, headers=self._headers(connection))
        except (httpx2.ConnectError, httpx2.ConnectTimeout):
            return ProviderOutcome.rejected(
                "PROVIDER_UNREACHABLE", "No pudimos conectar con LinkedIn. No se publicó nada; podés reintentar.", True
            )
        except httpx2.TimeoutException:
            return ProviderOutcome.unknown(
                "PROVIDER_TIMEOUT_AFTER_SEND",
                "LinkedIn no confirmó a tiempo. Verificá en tu perfil antes de reintentar para no duplicar.",
            )
        if response.status_code == 201:
            urn = response.headers.get("x-restli-id")
            return ProviderOutcome.succeeded(urn, post_url(urn) if urn else None)
        return _rejection(response)

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None:
        return None

    def read_recent_posts(self, connection: Connection, limit: int, profile_url: str | None = None) -> list[str]:
        if self._posts is None:
            raise ProviderReadError("READ_UNAVAILABLE", "La lectura de posts de LinkedIn no está configurada.", False)
        if not profile_url:
            raise ProviderReadError(
                "PROFILE_URL_REQUIRED", "Pegá la URL de tu perfil de LinkedIn para importar tus posts.", False
            )
        return self._posts.read(profile_url, connection.account_handle, limit)

    def _upload_image(self, connection: Connection, author: str, media: PublishableMedia) -> str:
        data = Path(media.local_path).read_bytes()
        init = self._http.post(
            f"{API_URL}/rest/images",
            params={"action": "initializeUpload"},
            json={"initializeUploadRequest": {"owner": author}},
            headers=self._headers(connection),
        )
        init.raise_for_status()
        value = init.json()["value"]
        upload = self._http.put(
            value["uploadUrl"],
            content=data,
            headers={"Authorization": f"Bearer {connection.access_token}", "Content-Type": media.mime_type},
        )
        upload.raise_for_status()
        return value["image"]

    def _headers(self, connection: Connection) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {connection.access_token}",
            "Linkedin-Version": self._config.api_version,
            "X-Restli-Protocol-Version": "2.0.0",
        }


def _json(response: httpx2.Response) -> dict:
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _rejection(response: httpx2.Response) -> ProviderOutcome:
    status = response.status_code
    detail = str(_json(response).get("message") or "")[:200]
    if status == 401:
        return ProviderOutcome.rejected(
            "OAUTH_TOKEN_EXPIRED",
            "La sesión de LinkedIn venció. Reconectá tu cuenta o copiá el texto para publicarlo manualmente.",
            True,
        )
    if status == 403:
        return ProviderOutcome.rejected(
            "PERMISSION_DENIED", "LinkedIn no permitió publicar con esta cuenta. Reconectá y aceptá el permiso.", False
        )
    if status == 429:
        return ProviderOutcome.rejected("RATE_LIMITED", "LinkedIn pidió esperar. Probá de nuevo en unos minutos.", True)
    if status in (400, 422):
        return ProviderOutcome.rejected("CONTENT_REJECTED", f"LinkedIn rechazó el contenido. {detail}".strip(), False)
    return ProviderOutcome.unknown(
        "PROVIDER_ERROR_AFTER_SEND",
        f"LinkedIn respondió con un error ({status}). Verificá en tu perfil antes de reintentar para no duplicar.",
    )

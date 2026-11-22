from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from urllib.parse import unquote, urlsplit

import httpx2

from .ports import ProviderReadError

API_URL = "https://api.apify.com/v2"
DEFAULT_ACTOR = "harvestapi~linkedin-profile-posts"
RUN_TIMEOUT_SECONDS = 90
MAX_CHARGE_USD = "0.10"
PROFILE_PATH = re.compile(r"^/in/([^/]+)/?$")
LNKD_LINK = re.compile(r"\s*https?://lnkd\.in/\S+")


@dataclass(frozen=True)
class ApifyConfig:
    token: str = field(repr=False)
    actor: str = DEFAULT_ACTOR


def profile_slug(url: str) -> str | None:
    parts = urlsplit(url.strip() if "://" in url else f"https://{url.strip()}")
    host = parts.netloc.lower()
    if host != "linkedin.com" and not host.endswith(".linkedin.com"):
        return None
    match = PROFILE_PATH.match(parts.path)
    return unquote(match.group(1)) if match else None


def same_person(a: str, b: str) -> bool:
    tokens_a, tokens_b = _name_tokens(a), _name_tokens(b)
    return bool(tokens_a and tokens_b) and (tokens_a <= tokens_b or tokens_b <= tokens_a)


def _name_tokens(name: str) -> set[str]:
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return set(re.findall(r"[a-z0-9]+", plain))


class ApifyLinkedInPosts:
    def __init__(self, config: ApifyConfig, http: httpx2.Client) -> None:
        self._config = config
        self._http = http

    def read(self, profile_url: str, expected_name: str | None, limit: int) -> list[str]:
        slug = profile_slug(profile_url)
        if slug is None:
            raise ProviderReadError(
                "INVALID_PROFILE_URL", "La URL tiene que ser de tu perfil: linkedin.com/in/<tu-perfil>.", False
            )
        try:
            response = self._http.post(
                f"{API_URL}/acts/{self._config.actor}/run-sync-get-dataset-items",
                params={"timeout": RUN_TIMEOUT_SECONDS, "maxItems": limit * 2, "maxTotalChargeUsd": MAX_CHARGE_USD},
                json={
                    "targetUrls": [f"https://www.linkedin.com/in/{slug}/"],
                    "maxPosts": limit * 2,
                    "includeReposts": False,
                },
                headers={"Authorization": f"Bearer {self._config.token}"},
                timeout=RUN_TIMEOUT_SECONDS + 15,
            )
        except httpx2.HTTPError as error:
            raise ProviderReadError(
                "PROVIDER_UNREACHABLE", "No pudimos conectar con el servicio que lee LinkedIn.", True
            ) from error
        if response.status_code not in (200, 201):
            raise _read_error(response.status_code)
        try:
            items = response.json()
        except ValueError as error:
            raise ProviderReadError(
                "PROVIDER_ERROR", "El servicio que lee LinkedIn devolvió una respuesta inválida.", True
            ) from error
        if not isinstance(items, list):
            items = []
        own = [
            item
            for item in items
            if isinstance(item, dict)
            and str((item.get("author") or {}).get("publicIdentifier") or "").lower() == slug.lower()
        ]
        author = (own[0].get("author") or {}).get("name") if own else None
        if author and not (expected_name and same_person(author, expected_name)):
            raise ProviderReadError(
                "PROFILE_MISMATCH",
                f"Ese perfil es de {author}, no de tu cuenta de LinkedIn conectada. Pegá la URL de tu propio perfil.",
                False,
            )
        posts = [LNKD_LINK.sub("", str(item.get("content") or "")).strip() for item in own]
        return [post for post in posts if post][:limit]


def _read_error(status: int) -> ProviderReadError:
    if status == 401:
        return ProviderReadError("READ_UNAVAILABLE", "El token de Apify no es válido.", False)
    if status == 402:
        return ProviderReadError("READ_UNAVAILABLE", "La cuenta de Apify se quedó sin crédito este mes.", False)
    if status == 408:
        return ProviderReadError("PROVIDER_TIMEOUT", "LinkedIn tardó demasiado en responder. Probá de nuevo.", True)
    if status == 429:
        return ProviderReadError("RATE_LIMITED", "Apify pidió esperar antes de leer más posts.", True)
    return ProviderReadError("PROVIDER_ERROR", f"El servicio que lee LinkedIn respondió con un error ({status}).", True)

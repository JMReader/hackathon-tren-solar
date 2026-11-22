from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import quote, urlencode

from .models import AssistedShareSupport, Platform


@dataclass(frozen=True)
class Composer:
    base_url: str
    official: bool
    params: dict[str, str] = field(default_factory=dict)

    def url(self, text: str) -> str:
        return f"{self.base_url}?{urlencode({**self.params, 'text': text}, quote_via=quote)}"


COMPOSERS: dict[Platform, Composer] = {
    Platform.X: Composer("https://x.com/intent/post", official=True),
    Platform.LINKEDIN: Composer("https://www.linkedin.com/feed/", official=False, params={"shareActive": "true"}),
}


def support(platform: Platform) -> AssistedShareSupport:
    return AssistedShareSupport(official=COMPOSERS[platform].official, attaches_photo=False)


def composer_url(platform: Platform, text: str) -> str:
    return COMPOSERS[platform].url(text)


def notice(platform: Platform) -> str:
    return (
        f"Se abre {platform.label} con el texto listo. Adjuntá la foto y tocá Publicar allí. "
        "Como la publicación ocurre fuera de la app, no podemos confirmar si se publicó."
    )

from __future__ import annotations

from .models import Connection, Platform, ProviderOutcome, Publication, PublishableDraft
from .ports import SocialAdapter


class BlockedAdapter:
    required_scopes: frozenset[str] = frozenset()
    supports_image = False
    supports_read_posts = False

    def __init__(self, platform: Platform, reason: str) -> None:
        self.platform = platform
        self._reason = reason

    def access_unavailable(self) -> str:
        return self._reason

    def publish(self, connection: Connection, draft: PublishableDraft) -> ProviderOutcome:
        raise RuntimeError(f"La publicación directa en {self.platform.label} está bloqueada.")

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None:
        return None


def default_adapters(
    linkedin: SocialAdapter | None = None, x: SocialAdapter | None = None
) -> dict[Platform, SocialAdapter]:
    return {
        Platform.LINKEDIN: linkedin
        or BlockedAdapter(
            Platform.LINKEDIN,
            "La publicación directa en LinkedIn no está configurada en este entorno. "
            "Abrí LinkedIn con el texto listo o copialo.",
        ),
        Platform.X: x
        or BlockedAdapter(
            Platform.X,
            "La publicación directa en X no está configurada en este entorno. Abrí X con el texto listo o copialo.",
        ),
    }

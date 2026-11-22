from __future__ import annotations

from .models import Connection, ErrorInfo, Platform, ProviderOutcome, Publication, PublishContent
from .ports import SocialAdapter


class BlockedAdapter:
    required_scopes: frozenset[str] = frozenset()

    def __init__(self, platform: Platform, code: str, message: str) -> None:
        self.platform = platform
        self._block = ErrorInfo(code=code, message=message, retryable=False)

    def access_unavailable(self) -> ErrorInfo:
        return self._block

    def publish(self, connection: Connection, content: PublishContent) -> ProviderOutcome:
        raise RuntimeError(f"{self.platform.label} está bloqueado: {self._block.code}")

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None:
        return None


def default_adapters() -> dict[Platform, SocialAdapter]:
    return {
        Platform.LINKEDIN: BlockedAdapter(
            Platform.LINKEDIN,
            "linkedin_app_unavailable",
            "La publicación directa en LinkedIn no está disponible. Abrí LinkedIn con el texto listo o copialo.",
        ),
        Platform.X: BlockedAdapter(
            Platform.X,
            "x_api_credits_unavailable",
            "La publicación directa en X no está disponible. Abrí X con el texto listo o copialo.",
        ),
    }

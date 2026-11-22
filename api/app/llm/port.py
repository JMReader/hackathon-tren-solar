from __future__ import annotations

from typing import Protocol

from ..models import ExtractionResult, Fact, Platform, VoiceContext


class LLMError(Exception):
    """Falla del proveedor LLM. Siempre retryable=True (R6)."""

    def __init__(self, message: str, code: str = "llm_failed"):
        super().__init__(message)
        self.code = code
        self.retryable = True


class LLMPort(Protocol):
    def extract(self, transcript: str) -> ExtractionResult:
        """Extrae hechos SOLO presentes en el transcript + preguntas abiertas (R1)."""
        ...

    def draft(self, *, platform: Platform, facts: list[Fact],
              voice: VoiceContext | None, max_chars: int) -> str:
        """Redacta el cuerpo del borrador usando sólo `facts`; `voice` es sólo estilo (R2)."""
        ...

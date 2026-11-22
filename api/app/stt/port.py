from __future__ import annotations

from typing import Protocol


class STTError(Exception):
    """Falla de transcripción. Siempre retryable=True (R6)."""

    def __init__(self, message: str, code: str = "stt_failed"):
        super().__init__(message)
        self.code = code
        self.retryable = True


class TranscriberPort(Protocol):
    def transcribe(self, audio_path: str, mime: str | None = None) -> str:
        """Devuelve el transcript del audio local privado."""
        ...

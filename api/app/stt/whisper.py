from __future__ import annotations

from pathlib import Path

import httpx

from ..config import Settings
from .fake import FakeTranscriber
from .port import STTError

OPENAI_AUDIO_URL = "https://api.openai.com/v1/audio/transcriptions"


class WhisperTranscriber:
    """STT real vía OpenAI Whisper API. Requiere OPENAI_API_KEY (env)."""

    def __init__(self, api_key: str, model: str = "whisper-1"):
        self.api_key = api_key
        self.model = model

    def transcribe(self, audio_path: str, mime: str | None = None) -> str:
        path = Path(audio_path)
        try:
            with path.open("rb") as fh:
                resp = httpx.post(
                    OPENAI_AUDIO_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"file": (path.name, fh, mime or "application/octet-stream")},
                    data={"model": self.model, "response_format": "json"},
                    timeout=90,
                )
            resp.raise_for_status()
            text = resp.json().get("text", "")
        except httpx.HTTPError as e:
            raise STTError(f"Whisper no respondió: {e}") from e
        if not isinstance(text, str) or not text.strip():
            raise STTError("Whisper devolvió una transcripción vacía.")
        return text


def build_transcriber(settings: Settings):
    """`auto`: whisper si hay OPENAI_API_KEY; si no → FakeTranscriber.

    Para STT real: STT_PROVIDER=whisper + OPENAI_API_KEY (+ WHISPER_MODEL opcional).
    """
    provider = settings.stt_provider
    if provider == "fake":
        return FakeTranscriber(settings.fake_transcript)
    if provider == "auto":
        provider = "whisper" if settings.openai_api_key else "fake"
    if provider == "whisper":
        if not settings.openai_api_key:
            raise STTError("STT_PROVIDER=whisper requiere OPENAI_API_KEY.", code="missing_api_key")
        return WhisperTranscriber(settings.openai_api_key, settings.whisper_model)
    if provider == "fake":
        return FakeTranscriber(settings.fake_transcript)
    raise STTError(f"STT_PROVIDER desconocido: '{provider}'.", code="missing_api_key")

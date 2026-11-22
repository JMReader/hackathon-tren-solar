from __future__ import annotations

from pathlib import Path

import httpx

from ..config import Settings
from .fake import FakeTranscriber
from .port import STTError

OPENAI_AUDIO_URL = "https://api.openai.com/v1/audio/transcriptions"


class WhisperTranscriber:
    """STT real vía OpenAI Whisper API. Requiere OPENAI_API_KEY (env)."""

    def __init__(self, api_key: str, model: str = "whisper-1", language: str | None = None):
        self.api_key = api_key
        self.model = model
        self.language = language

    def transcribe(self, audio_path: str, mime: str | None = None) -> str:
        path = Path(audio_path)
        data: dict[str, str] = {"model": self.model, "response_format": "json"}
        if self.language:
            data["language"] = self.language
        try:
            with path.open("rb") as fh:
                resp = httpx.post(
                    OPENAI_AUDIO_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"file": (path.name, fh, mime or "application/octet-stream")},
                    data=data,
                    timeout=90,
                )
            resp.raise_for_status()
            text = resp.json().get("text", "")
        except httpx.HTTPError as e:
            raise STTError(f"Whisper no respondió: {e}") from e
        if not isinstance(text, str) or not text.strip():
            raise STTError("Whisper devolvió una transcripción vacía.")
        return text

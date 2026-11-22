from __future__ import annotations

from pathlib import Path

import httpx

from .port import STTError

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


class ElevenLabsTranscriber:
    """STT real vía ElevenLabs Scribe. Requiere ELEVENLABS_API_KEY (env).

    `language_code` (ISO-639-1/3, ej. "es"/"spa") guía el modelo — clave para
    voces en español con tecnicismos en inglés ("hackathon")."""

    def __init__(self, api_key: str, model: str = "scribe_v3", language: str | None = None):
        self.api_key = api_key
        self.model = model
        self.language = language

    def transcribe(self, audio_path: str, mime: str | None = None) -> str:
        path = Path(audio_path)
        data: dict[str, str] = {"model_id": self.model}
        if self.language:
            data["language_code"] = self.language
        try:
            with path.open("rb") as fh:
                resp = httpx.post(
                    ELEVENLABS_STT_URL,
                    headers={"xi-api-key": self.api_key},
                    files={"file": (path.name, fh, mime or "application/octet-stream")},
                    data=data,
                    timeout=90,
                )
            resp.raise_for_status()
            text = resp.json().get("text", "")
        except httpx.HTTPError as e:
            raise STTError(f"ElevenLabs no respondió: {e}") from e
        if not isinstance(text, str) or not text.strip():
            raise STTError("ElevenLabs devolvió una transcripción vacía.")
        return text

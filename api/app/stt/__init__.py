from __future__ import annotations

from ..config import Settings
from .elevenlabs import ElevenLabsTranscriber
from .fake import FakeTranscriber
from .port import STTError
from .whisper import WhisperTranscriber


def build_transcriber(settings: Settings):
    """`auto`: ElevenLabs si hay ELEVENLABS_API_KEY; si no, whisper; si no, fake.

    STT_PROVIDER=elevenlabs|whisper|fake fuerza el provider.
    STT_LANGUAGE (ej. "es") se pasa como hint a los providers reales.
    """
    provider = settings.stt_provider
    if provider == "fake":
        return FakeTranscriber(settings.fake_transcript)
    if provider == "auto":
        if settings.elevenlabs_api_key:
            provider = "elevenlabs"
        elif settings.openai_api_key:
            provider = "whisper"
        else:
            return FakeTranscriber(settings.fake_transcript)
    if provider == "elevenlabs":
        if not settings.elevenlabs_api_key:
            raise STTError("STT_PROVIDER=elevenlabs requiere ELEVENLABS_API_KEY.", code="missing_api_key")
        return ElevenLabsTranscriber(
            settings.elevenlabs_api_key, settings.elevenlabs_model, settings.stt_language)
    if provider == "whisper":
        if not settings.openai_api_key:
            raise STTError("STT_PROVIDER=whisper requiere OPENAI_API_KEY.", code="missing_api_key")
        return WhisperTranscriber(
            settings.openai_api_key, settings.whisper_model, settings.stt_language)
    raise STTError(f"STT_PROVIDER desconocido: '{provider}'.", code="missing_api_key")

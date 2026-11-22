from __future__ import annotations

from pathlib import Path

from .port import STTError

DEFAULT_TRANSCRIPT = (
    "Este finde hicimos una app de turnos médicos en React para una clínica local. "
    "Yo diseñé las pantallas y armé el flujo de reserva en 3 pasos."
)


class FakeTranscriber:
    """Determinista para tests/demos: sidecar `<audio>.txt`, transcript fija o fallo.

    - Si existe `<audio_path>.txt` junto al archivo, devuelve su contenido.
    - `fail=True` o contenido "FAIL" → STTError retryable (simula falla STT).
    """

    def __init__(self, transcript: str | None = None, fail: bool = False):
        self.transcript = transcript
        self.fail = fail

    def transcribe(self, audio_path: str, mime: str | None = None) -> str:
        if self.fail:
            raise STTError("FakeTranscriber configurado para fallar (prueba de recuperación).")
        sidecar = Path(f"{audio_path}.txt")
        if sidecar.exists():
            text = sidecar.read_text(encoding="utf-8").strip()
            if text == "FAIL":
                raise STTError("El archivo marcó falla de transcripción (sidecar FAIL).")
            return text
        if self.transcript:
            return self.transcript
        return DEFAULT_TRANSCRIPT

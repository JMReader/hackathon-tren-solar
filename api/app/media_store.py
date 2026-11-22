from __future__ import annotations

import mimetypes
from datetime import datetime, timezone
from pathlib import Path

from .db import Store
from .errors import bad_request, not_found
from .ids import new_id
from .models import MediaAsset

IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4", ".aac", ".flac", ".opus"}


class MediaStore:
    """Directorio local privado: los binarios nunca se exponen por HTTP (R6)."""

    def __init__(self, media_dir: Path | str, store: Store,
                 max_photo_bytes: int, max_audio_bytes: int):
        self.dir = Path(media_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.store = store
        self.max_photo_bytes = max_photo_bytes
        self.max_audio_bytes = max_audio_bytes

    def _ext_for(self, filename: str | None, mime: str | None) -> str:
        ext = Path(filename or "").suffix.lower()
        if ext:
            return ext
        guess = mimetypes.guess_extension(mime or "")
        return guess or ".bin"

    def save_photo(self, data: bytes, filename: str | None,
                   content_type: str | None, alt_text: str | None,
                   session_id: str) -> MediaAsset:
        mime = content_type or mimetypes.guess_type(filename or "")[0] or "application/octet-stream"
        if mime not in IMAGE_MIMES:
            raise bad_request(
                f"Tipo de imagen no soportado: '{mime}'. Usá jpeg, png, webp o gif.",
                code="unsupported_media_type",
            )
        if len(data) > self.max_photo_bytes:
            raise bad_request("La imagen supera el máximo de 10 MB.", code="media_too_large")
        photo_id = new_id("med")
        local_path = self.dir / f"{photo_id}{self._ext_for(filename, mime)}"
        local_path.write_bytes(data)
        self.store.save_media(
            photo_id, session_id, mime, alt_text, len(data), str(local_path),
            datetime.now(timezone.utc).isoformat(),
        )
        return MediaAsset(photo_id=photo_id, mime_type=mime,
                          alt_text=alt_text, size_bytes=len(data))

    def save_audio(self, data: bytes, filename: str | None, content_type: str | None) -> str:
        ext = Path(filename or "").suffix.lower()
        mime = content_type or ""
        if not (mime.startswith("audio/") or ext in AUDIO_EXTS):
            raise bad_request(
                f"Tipo de audio no soportado: '{mime or ext}'. Usá mp3, wav, m4a, ogg, webm...",
                code="unsupported_media_type",
            )
        if len(data) > self.max_audio_bytes:
            raise bad_request("El audio supera el máximo de 25 MB.", code="media_too_large")
        audio_id = new_id("aud")
        local_path = self.dir / f"{audio_id}{ext or '.bin'}"
        local_path.write_bytes(data)
        return str(local_path)

    def resolve_photo(self, photo_id: str, session_id: str | None = None) -> MediaAsset:
        asset = self.store.get_media(photo_id)
        owner = self.store.media_session(photo_id)
        if asset is None or (session_id is not None and owner != session_id):
            raise not_found("media", photo_id)
        return asset

    def local_path(self, photo_id: str) -> str | None:
        return self.store.media_local_path(photo_id)

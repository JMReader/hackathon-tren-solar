from __future__ import annotations

import tempfile
from pathlib import Path

import httpx


class SupabaseMediaBackend:
    """Supabase Storage privado (bucket `media`) para fotos, audio y CV.

    `local_path()` materializa el objeto en /tmp sólo cuando el código lo pide
    (LinkedIn image upload, Whisper sobre audio, etc.): el archivo en Supabase
    sigue siendo privado y no se sirve por HTTP (R6).
    """

    def __init__(self, supabase_url: str, service_key: str, bucket: str = "media"):
        self.url = supabase_url.rstrip("/")
        self.key = service_key
        self.bucket = bucket
        self._cache = Path(tempfile.gettempdir()) / "ts-media-cache"
        self._cache.mkdir(parents=True, exist_ok=True)
        self._http = httpx.Client(timeout=60)

    def _headers(self, mime: str | None = None) -> dict[str, str]:
        h = {"Authorization": f"Bearer {self.key}", "apikey": self.key}
        if mime:
            h["Content-Type"] = mime
        return h

    def put(self, key: str, data: bytes, mime: str) -> str:
        """Sube bytes al bucket privado; devuelve la referencia (storage://...)."""
        r = self._http.post(
            f"{self.url}/storage/v1/object/{self.bucket}/{key}",
            headers=self._headers(mime),
            content=data,
        )
        r.raise_for_status()
        # También materializar en cache local para llamadas dentro de la misma
        # invocación (e.g. publish → LinkedIn _upload_image).
        local = self._cache / key
        local.parent.mkdir(parents=True, exist_ok=True)
        local.write_bytes(data)
        return f"storage://{self.bucket}/{key}"

    def local_path(self, ref: str) -> Path | None:
        """Devuelve una ruta local real del objeto. Descarga de Supabase si falta."""
        if not ref:
            return None
        if not ref.startswith("storage://"):
            p = Path(ref)
            return p if p.exists() else None
        key = ref[len("storage://"):].split("/", 1)[1]
        local = self._cache / key
        if not local.exists():
            local.parent.mkdir(parents=True, exist_ok=True)
            r = self._http.get(
                f"{self.url}/storage/v1/object/authenticated/{self.bucket}/{key}",
                headers=self._headers(),
            )
            if r.status_code == 404:
                return None
            r.raise_for_status()
            local.write_bytes(r.content)
        return local

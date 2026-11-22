from __future__ import annotations

import secrets
import tempfile
from pathlib import Path
from typing import Annotated

import httpx2
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

from .adapters import default_adapters
from .crypto import TokenCipher
from .linkedin import LinkedInAdapter
from .memory import InMemoryConnectionStore, InMemoryPublicationStore
from .models import Platform, PublishableDraft, PublishableMedia
from .oauth import ConnectionFlow
from .router import create_router
from .service import SocialService
from .settings import Settings

DEV_OWNER = "local-dev"
PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png"}
MAX_PHOTO_BYTES = 8 * 1024 * 1024
PAGE = (Path(__file__).parent / "dev.html").read_text(encoding="utf-8")


class DevDrafts:
    def __init__(self) -> None:
        self._drafts: dict[tuple[str, str], PublishableDraft] = {}
        self._media_dir = Path(tempfile.mkdtemp(prefix="tren-solar-media-"))

    def get(self, owner_id: str, draft_id: str) -> PublishableDraft | None:
        return self._drafts.get((owner_id, draft_id))

    def create(
        self, owner_id: str, platform: Platform, body: str, photo: tuple[bytes, str] | None, alt_text: str | None
    ) -> PublishableDraft:
        draft_id = f"drf_dev_{secrets.token_hex(4)}"
        media = None
        if photo:
            data, mime_type = photo
            path = self._media_dir / f"{draft_id}{PHOTO_TYPES[mime_type]}"
            path.write_bytes(data)
            media = PublishableMedia(f"med_{draft_id}", mime_type, str(path), alt_text or None)
        draft = PublishableDraft(draft_id, 1, platform, body, media)
        self._drafts[(owner_id, draft_id)] = draft
        return draft


def create_app(settings: Settings, http: httpx2.Client | None = None) -> FastAPI:
    if not settings.token_key:
        raise RuntimeError("Falta SOCIAL_TOKEN_KEY para cifrar los tokens de redes.")
    http = http or httpx2.Client(timeout=httpx2.Timeout(20.0, connect=5.0))
    connections = InMemoryConnectionStore(TokenCipher(settings.token_key))
    drafts = DevDrafts()
    linkedin = LinkedInAdapter(settings.linkedin, http) if settings.linkedin else None
    service = SocialService(default_adapters(linkedin), connections, InMemoryPublicationStore(), drafts)
    flow = ConnectionFlow(
        service, {Platform.LINKEDIN: linkedin} if linkedin else {}, connections, settings.web_base_url
    )

    app = FastAPI(title="Tren Solar · social (dev)")
    app.include_router(create_router(service, flow, lambda: DEV_OWNER), prefix="/api/v1")

    @app.get("/dev", response_class=HTMLResponse)
    def dev_page() -> str:
        return PAGE

    @app.post("/dev/drafts")
    async def create_draft(
        platform: Annotated[Platform, Form()],
        body: Annotated[str, Form(min_length=1)],
        alt_text: Annotated[str | None, Form()] = None,
        photo: Annotated[UploadFile | None, File()] = None,
    ) -> JSONResponse:
        upload = None
        if photo is not None and photo.filename:
            if photo.content_type not in PHOTO_TYPES:
                return JSONResponse(status_code=422, content={"error": "La foto debe ser JPG o PNG."})
            data = await photo.read(MAX_PHOTO_BYTES + 1)
            if len(data) > MAX_PHOTO_BYTES:
                return JSONResponse(status_code=422, content={"error": "La foto supera 8 MB."})
            upload = (data, photo.content_type)
        draft = drafts.create(DEV_OWNER, platform, body, upload, alt_text)
        return JSONResponse(
            status_code=201,
            content={
                "draft_id": draft.draft_id,
                "draft_revision": draft.draft_revision,
                "platform": draft.platform.value,
                "has_photo": draft.media is not None,
            },
        )

    return app


def build() -> FastAPI:
    return create_app(Settings.from_env())

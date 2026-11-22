from __future__ import annotations

import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings
from .db import Store
from .errors import ApiError, ProfileResponse
from .llm.providers import build_llm
from .media_store import MediaStore
from .models import ApiErrorBody, ErrorDetail
from .router import create_router
from .service import CoreService
from .session_service import SessionService
from .stt.whisper import build_transcriber
from .style_reader import build_style_reader


class Services:
    def __init__(self, settings: Settings | None = None,
                 llm=None, transcriber=None, style_reader=None):
        settings = settings or Settings.from_env()
        self.settings = settings
        store = Store(settings.db_path)
        media = MediaStore(settings.media_dir, store,
                           settings.max_photo_bytes, settings.max_audio_bytes)
        llm = llm if llm is not None else build_llm(settings)
        transcriber = (transcriber if transcriber is not None
                       else build_transcriber(settings))
        style_reader = (style_reader if style_reader is not None
                        else build_style_reader(os.environ.get("FAKE_STYLE_POSTS")))
        ttl = int(os.environ.get("SESSION_TTL_HOURS", "24"))
        self.core = CoreService(store, media, llm, transcriber)
        self.sessions = SessionService(store, media, style_reader, ttl)


def create_app(services: Services | None = None,
               settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Hackathon Tren Solar API", version="0.1.0")
    app.state.services = services or Services(settings)

    def _body(detail: ErrorDetail) -> dict:
        return ApiErrorBody(error=detail).model_dump(mode="json")

    @app.exception_handler(ApiError)
    async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.http_status, content=_body(exc.detail))

    @app.exception_handler(ProfileResponse)
    async def profile_handler(_: Request, exc: ProfileResponse) -> JSONResponse:
        return JSONResponse(status_code=exc.http_status,
                            content=exc.profile.model_dump(mode="json"))

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        msg = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}"
                        for e in exc.errors())
        return JSONResponse(status_code=422, content=_body(
            ErrorDetail(code="validation_error", message=msg, retryable=False)))

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "not_found" if exc.status_code == 404 else "http_error"
        return JSONResponse(status_code=exc.status_code, content=_body(
            ErrorDetail(code=code, message=str(exc.detail), retryable=False)))

    svc = app.state.services
    app.include_router(create_router(svc.core, svc.sessions), prefix="/api/v1")
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:create_app", factory=True, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()

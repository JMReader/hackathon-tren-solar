from __future__ import annotations

import os

from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from social.router import create_router as create_social_router

from .config import Settings
from .db import Store
from .db_postgres import PostgresStore
from .errors import ApiError, ProfileResponse
from .llm.providers import build_llm
from .media_store import MediaStore, SupabaseMediaStore
from .models import ApiErrorBody, ErrorDetail
from .router import create_router
from .service import CoreService
from .session_service import SessionService
from .social_wiring import SocialStyleReader, build_social
from .stt.whisper import build_transcriber
from .style_reader import build_style_reader
from .supabase_storage import SupabaseMediaBackend


class Services:
    def __init__(self, settings: Settings | None = None,
                 llm=None, transcriber=None, style_reader=None,
                 social_settings=None, social_http=None):
        settings = settings or Settings.from_env()
        self.settings = settings
        pg_dsn = settings.postgres_dsn
        if pg_dsn:
            store = PostgresStore(pg_dsn)
        else:
            store = Store(settings.db_path)
        if settings.supabase_url and settings.supabase_service_role_key:
            media_backend = SupabaseMediaBackend(
                settings.supabase_url, settings.supabase_service_role_key)
            media = SupabaseMediaStore(media_backend, store,
                                       settings.max_photo_bytes,
                                       settings.max_audio_bytes)
        else:
            media = MediaStore(settings.media_dir, store,
                               settings.max_photo_bytes, settings.max_audio_bytes)
        llm = llm if llm is not None else build_llm(settings)
        transcriber = (transcriber if transcriber is not None
                       else build_transcriber(settings))
        ttl = int(os.environ.get("SESSION_TTL_HOURS", "24"))
        self.core = CoreService(store, media, llm, transcriber)
        self.social = build_social(self.core, settings.db_path.parent,
                                   social_settings, social_http, pg_dsn=pg_dsn)
        if style_reader is None:
            fake_posts = os.environ.get("FAKE_STYLE_POSTS")
            style_reader = (build_style_reader(fake_posts) if fake_posts
                            else SocialStyleReader(self.social.service))
        self.sessions = SessionService(store, media, style_reader, ttl)


def create_app(services: Services | None = None,
               settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Hackathon Tren Solar API", version="0.1.0")
    app.state.services = services or Services(settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app.state.services.settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

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

    def social_owner(x_session_id: str | None = Header(None)) -> str:
        return svc.sessions.require_session(x_session_id)

    app.include_router(
        create_social_router(svc.social.service, svc.social.flow, social_owner),
        prefix="/api/v1",
    )
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:create_app", factory=True, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()

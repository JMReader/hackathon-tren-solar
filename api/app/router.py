import json
from typing import Annotated, Callable

from fastapi import APIRouter, Depends, Form, Header, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import ValidationError

from .errors import ApiError
from .models import (
    Achievement,
    ApproveAchievementRequest,
    AuthorProfile,
    CompleteOnboardingRequest,
    CreateAchievementTextRequest,
    Draft,
    GenerateDraftsRequest,
    GenerateDraftsResponse,
    LoginRequest,
    LoginResponse,
    MediaAsset,
    SessionCreated,
    SetAuthorProfilePhotoRequest,
    SyncStyleRequest,
    UpdateAchievementRequest,
    UpdateAuthorProfileRequest,
    UpdateDraftRequest,
)
from .service import CoreService
from .session_service import SessionService


def _parse(model, body) -> object:
    try:
        return model.model_validate(body)
    except ValidationError as e:
        raise ApiError(422, "validation_error",
                       "; ".join(f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                                 for err in e.errors())) from e


def create_router(
    service: CoreService,
    sessions: SessionService,
    on_approved: Callable[[str, Achievement], object] | None = None,
) -> APIRouter:
    router = APIRouter()

    def require_session(x_session_id: str | None = Header(None)) -> str:
        return sessions.require_session(x_session_id)

    Session = Annotated[str, Depends(require_session)]

    # --- sesión anónima + onboarding (Issue #3, decisión 2026-11-22) ---

    @router.post("/session", status_code=201, tags=["session"])
    def create_session() -> SessionCreated:
        return sessions.create_session()

    @router.post("/auth/login", tags=["auth"])
    def demo_login(req: LoginRequest) -> LoginResponse:
        return sessions.demo_login(req.email, req.password)

    @router.get("/session/profile", tags=["session"])
    def get_profile(session_id: Session) -> AuthorProfile:
        return sessions.get_profile(session_id)

    @router.patch("/session/profile", tags=["session"])
    def update_profile(session_id: Session,
                       req: UpdateAuthorProfileRequest) -> AuthorProfile:
        return sessions.update_profile(session_id, req)

    @router.put("/session/profile/photo", tags=["session"])
    def set_profile_photo(session_id: Session,
                          req: SetAuthorProfilePhotoRequest) -> AuthorProfile:
        return sessions.set_profile_photo(session_id, req)

    @router.post("/session/cv", status_code=201, tags=["session"])
    async def upload_cv(session_id: Session, file: UploadFile) -> AuthorProfile:
        data = await file.read()
        return sessions.upload_cv(session_id, data, file.filename, file.content_type)

    @router.post("/session/profile/sync-style", tags=["session"])
    def sync_style(session_id: Session,
                   req: SyncStyleRequest | None = None) -> AuthorProfile:
        return sessions.sync_style(session_id, req or SyncStyleRequest())

    @router.post("/session/profile/complete", tags=["session"])
    def complete_onboarding(session_id: Session,
                            req: CompleteOnboardingRequest) -> AuthorProfile:
        return sessions.complete_onboarding(session_id, req)

    # --- media privada ---

    @router.post("/media", status_code=201, tags=["media"])
    async def upload_media(session_id: Session, file: UploadFile,
                           alt_text: str | None = Form(None)) -> MediaAsset:
        data = await file.read()
        return service.upload_media(session_id, data, file.filename,
                                    file.content_type, alt_text)

    @router.get("/media/{photo_id}", tags=["media"], response_class=FileResponse)
    def get_media(session_id: Session, photo_id: str) -> FileResponse:
        path, mime = service.photo_file(session_id, photo_id)
        return FileResponse(path, media_type=mime, headers={"Cache-Control": "private, max-age=3600"})

    # --- achievements + drafts ---

    @router.post("/achievements", status_code=201, tags=["achievements"])
    async def create_achievement(request: Request, session_id: Session) -> Achievement:
        content_type = request.headers.get("content-type", "")
        if content_type.startswith(("multipart/form-data",
                                    "application/x-www-form-urlencoded")):
            form = await request.form()
            return await _create_multipart(service, session_id, form)
        try:
            body = await request.json()
        except json.JSONDecodeError as e:
            raise ApiError(400, "bad_request", f"Body JSON inválido: {e}") from e
        req: CreateAchievementTextRequest = _parse(CreateAchievementTextRequest, body)
        return service.create_achievement(
            session_id=session_id, input_type=req.input_type, text=req.text,
            photo_id=req.photo_id, source_metadata=req.source_metadata,
        )

    @router.get("/achievements", tags=["achievements"])
    def list_achievements(session_id: Session) -> list[Achievement]:
        return service.list_achievements(session_id)

    @router.get("/achievements/{achievement_id}/drafts", tags=["drafts"])
    def list_drafts(session_id: Session, achievement_id: str) -> list[Draft]:
        return service.list_drafts(session_id, achievement_id)

    @router.delete("/achievements/{achievement_id}", status_code=204, tags=["achievements"])
    def delete_achievement(session_id: Session, achievement_id: str) -> Response:
        service.delete_achievement(session_id, achievement_id)
        return Response(status_code=204)

    @router.get("/achievements/{achievement_id}", tags=["achievements"])
    def get_achievement(session_id: Session, achievement_id: str) -> Achievement:
        return service.get_achievement(session_id, achievement_id)

    @router.patch("/achievements/{achievement_id}", tags=["achievements"])
    def update_achievement(session_id: Session, achievement_id: str,
                           req: UpdateAchievementRequest) -> Achievement:
        return service.update_achievement(session_id, achievement_id, req)

    @router.post("/achievements/{achievement_id}/approve", tags=["achievements"])
    def approve_achievement(session_id: Session, achievement_id: str,
                            req: ApproveAchievementRequest) -> Achievement:
        achievement = service.approve_achievement(session_id, achievement_id, req)
        if req.add_to_portfolio and on_approved is not None:
            on_approved(session_id, achievement)
        return achievement

    @router.post("/achievements/{achievement_id}/drafts",
                 status_code=201, tags=["drafts"])
    def generate_drafts(session_id: Session, achievement_id: str,
                        req: GenerateDraftsRequest) -> GenerateDraftsResponse:
        return service.generate_drafts(session_id, achievement_id, req)

    @router.get("/drafts/{draft_id}", tags=["drafts"])
    def get_draft(session_id: Session, draft_id: str) -> Draft:
        return service.get_draft(session_id, draft_id)

    @router.patch("/drafts/{draft_id}", tags=["drafts"])
    def update_draft(session_id: Session, draft_id: str,
                     req: UpdateDraftRequest) -> Draft:
        return service.update_draft(session_id, draft_id, req)

    return router


async def _create_multipart(service: CoreService, session_id: str, form) -> Achievement:
    """POST /achievements multipart: `audio` + `photo` + `text` opcional (Parte 3)."""
    input_type = str(form.get("input_type") or "audio")
    if input_type not in ("audio", "text"):
        raise ApiError(400, "bad_request",
                       f"input_type '{input_type}' no soportado en multipart; usá 'audio' o 'text'.")

    async def _file_tuple(field: str):
        item = form.get(field)
        if item is None or not getattr(item, "filename", None):
            return None
        return (await item.read(), item.filename, item.content_type)

    audio = await _file_tuple("audio")
    photo = await _file_tuple("photo")
    text = form.get("text")
    text = str(text) if text else None

    if input_type == "audio" and audio is None and not (text and len(text) >= 10):
        raise ApiError(400, "missing_audio",
                       "input_type='audio' necesita el archivo `audio` (o `text` >= 10 chars).")
    if input_type == "text" and not (text and len(text) >= 10):
        raise ApiError(400, "missing_input",
                       "input_type='text' necesita `text` de al menos 10 caracteres.")
    return service.create_achievement(
        session_id=session_id, input_type=input_type, text=text,
        audio=audio, photo=photo,
    )

from typing import Annotated

from fastapi import APIRouter, Depends, Form, Header, Request, UploadFile
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


def create_router(service: CoreService, sessions: SessionService) -> APIRouter:
    router = APIRouter()

    def require_session(x_session_id: str | None = Header(None)) -> str:
        return sessions.require_session(x_session_id)

    Session = Annotated[str, Depends(require_session)]

    # --- sesión anónima + onboarding (Issue #3, decisión 2026-11-22) ---

    @router.post("/session", status_code=201, tags=["session"])
    def create_session() -> SessionCreated:
        return sessions.create_session()

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

    # --- achievements + drafts ---

    @router.post("/achievements", status_code=201, tags=["achievements"])
    async def create_achievement(request: Request, session_id: Session) -> Achievement:
        content_type = request.headers.get("content-type", "")
        if content_type.startswith("multipart/form-data"):
            form = await request.form()
            return await _create_multipart(service, session_id, form)
        body = await request.json()
        req: CreateAchievementTextRequest = _parse(CreateAchievementTextRequest, body)
        return service.create_achievement(
            session_id=session_id, input_type=req.input_type, text=req.text,
            photo_id=req.photo_id, source_metadata=req.source_metadata,
        )

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
        return service.approve_achievement(session_id, achievement_id, req)

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
    raise ApiError(501, "not_implemented",
                   "La ingesta multipart (audio + foto) se habilita en la Parte 3.")

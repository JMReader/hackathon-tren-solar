from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .models import AssistedShare, ConnectionState, Platform, Publication, PublicationStatus, SocialConnectionStatus
from .service import SocialError, SocialService

PENDING = (PublicationStatus.PUBLISHING, PublicationStatus.UNKNOWN)


class CreatePublicationRequest(BaseModel):
    draft_revision: int
    confirm_publish: bool


class ResolutionRequest(BaseModel):
    outcome: Literal["not_published"]


def _error(error: SocialError) -> JSONResponse:
    return JSONResponse(
        status_code=error.http_status,
        content={"error": error.detail().model_dump(), **error.extra},
    )


def create_router(service: SocialService, current_owner: Callable[..., str]) -> APIRouter:
    router = APIRouter(tags=["social"])
    Owner = Annotated[str, Depends(current_owner)]

    @router.get("/social/{platform}/connection", response_model=SocialConnectionStatus)
    def get_connection(platform: Platform, owner_id: Owner) -> SocialConnectionStatus:
        return service.connection_status(owner_id, platform)

    @router.post("/social/{platform}/connection", response_model=SocialConnectionStatus)
    def start_connection(platform: Platform, owner_id: Owner) -> JSONResponse:
        status = service.connection_status(owner_id, platform)
        if status.status is ConnectionState.ACCESS_UNAVAILABLE:
            return JSONResponse(status_code=503, content=status.model_dump(mode="json"))
        return JSONResponse(
            status_code=501,
            content={
                "error": {
                    "code": "OAUTH_NOT_IMPLEMENTED",
                    "message": f"La conexión con {platform.label} todavía no está implementada.",
                    "retryable": False,
                }
            },
        )

    @router.get("/drafts/{draft_id}/assisted-share", response_model=AssistedShare)
    def get_assisted_share(draft_id: str, owner_id: Owner) -> AssistedShare | JSONResponse:
        try:
            return service.assisted_share(owner_id, draft_id)
        except SocialError as error:
            return _error(error)

    @router.post("/drafts/{draft_id}/publications", response_model=Publication)
    def publish_draft(
        draft_id: str,
        request: CreatePublicationRequest,
        response: Response,
        owner_id: Owner,
        idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    ) -> Publication | JSONResponse:
        try:
            publication, replayed = service.publish(
                owner_id, draft_id, idempotency_key, request.draft_revision, request.confirm_publish
            )
        except SocialError as error:
            return _error(error)
        response.status_code = 202 if publication.status in PENDING else 200
        if replayed:
            response.headers["Idempotent-Replayed"] = "true"
        return publication

    @router.get("/publications/{publication_id}", response_model=Publication)
    def get_publication(publication_id: str, owner_id: Owner) -> Publication | JSONResponse:
        try:
            return service.get(owner_id, publication_id)
        except SocialError as error:
            return _error(error)

    @router.post("/publications/{publication_id}/resolution", response_model=Publication)
    def resolve_publication(
        publication_id: str, request: ResolutionRequest, owner_id: Owner
    ) -> Publication | JSONResponse:
        try:
            return service.resolve_not_published(owner_id, publication_id)
        except SocialError as error:
            return _error(error)

    return router

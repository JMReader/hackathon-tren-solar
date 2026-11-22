from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Body, Depends, Header, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from .models import (
    AssistedShare,
    Platform,
    Publication,
    PublicationStatus,
    SocialConnectionStatus,
    StartSocialConnectionRequest,
    StartSocialConnectionResponse,
)
from .oauth import ConnectionFlow, ProviderUnavailable
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


def create_router(service: SocialService, flow: ConnectionFlow, current_owner: Callable[..., str]) -> APIRouter:
    router = APIRouter(tags=["social"])
    Owner = Annotated[str, Depends(current_owner)]

    @router.get("/social/{platform}/connection", response_model=SocialConnectionStatus)
    def get_connection(platform: Platform, owner_id: Owner) -> SocialConnectionStatus:
        return service.connection_status(owner_id, platform)

    @router.post("/social/{platform}/connection", response_model=StartSocialConnectionResponse)
    def start_connection(
        platform: Platform,
        owner_id: Owner,
        request: Annotated[StartSocialConnectionRequest | None, Body()] = None,
    ) -> StartSocialConnectionResponse | JSONResponse:
        try:
            return flow.start(owner_id, platform, request.return_to if request else None)
        except ProviderUnavailable as unavailable:
            return JSONResponse(status_code=503, content=unavailable.status.model_dump(mode="json"))
        except SocialError as error:
            return _error(error)

    @router.get("/social/{platform}/callback", response_model=None, status_code=302)
    def oauth_callback(
        platform: Platform, state: str, code: str | None = None, error: str | None = None
    ) -> RedirectResponse | JSONResponse:
        try:
            return RedirectResponse(flow.complete(platform, state, code, error), status_code=302)
        except SocialError as failure:
            return _error(failure)

    @router.get("/drafts/{draft_id}/assisted-share", response_model=AssistedShare)
    def get_assisted_share(draft_id: str, owner_id: Owner) -> AssistedShare | JSONResponse:
        try:
            return service.assisted_share(owner_id, draft_id)
        except SocialError as error:
            return _error(error)

    @router.get("/drafts/{draft_id}/publications", response_model=list[Publication])
    def list_publications(draft_id: str, owner_id: Owner) -> list[Publication] | JSONResponse:
        try:
            return service.list_draft_publications(owner_id, draft_id)
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

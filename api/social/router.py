from collections.abc import Callable, Iterator
from contextlib import contextmanager
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel

from .models import AssistedShare, Availability, Platform, Publication
from .service import SocialError, SocialService


class PublicationRequest(BaseModel):
    draft_revision: int
    confirmed: bool


class ResolutionRequest(BaseModel):
    outcome: Literal["not_published"]


@contextmanager
def _http_errors() -> Iterator[None]:
    try:
        yield
    except SocialError as error:
        raise HTTPException(status_code=error.http_status, detail=error.detail()) from error


def create_router(service: SocialService, current_owner: Callable[..., str]) -> APIRouter:
    router = APIRouter(tags=["social"])
    Owner = Annotated[str, Depends(current_owner)]

    @router.get("/social/{platform}/connection", response_model=Availability)
    def get_connection(platform: Platform, owner_id: Owner) -> Availability:
        return service.availability(owner_id, platform)

    @router.get("/drafts/{draft_id}/assisted-share", response_model=AssistedShare)
    def get_assisted_share(draft_id: str, owner_id: Owner) -> AssistedShare:
        with _http_errors():
            return service.assisted_share(owner_id, draft_id)

    @router.post("/drafts/{draft_id}/publications", response_model=Publication, status_code=201)
    def create_publication(
        draft_id: str,
        request: PublicationRequest,
        response: Response,
        owner_id: Owner,
        idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    ) -> Publication:
        with _http_errors():
            publication, replayed = service.publish(
                owner_id, draft_id, idempotency_key, request.draft_revision, request.confirmed
            )
        if replayed:
            response.status_code = 200
            response.headers["Idempotent-Replayed"] = "true"
        return publication

    @router.get("/publications/{publication_id}", response_model=Publication)
    def get_publication(publication_id: str, owner_id: Owner) -> Publication:
        with _http_errors():
            return service.get(owner_id, publication_id)

    @router.post("/publications/{publication_id}/resolution", response_model=Publication)
    def resolve_publication(publication_id: str, request: ResolutionRequest, owner_id: Owner) -> Publication:
        with _http_errors():
            return service.resolve_not_published(owner_id, publication_id)

    return router

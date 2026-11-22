from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response

from ..session_service import SessionService
from .models import (
    CandidateContactRequest,
    EmployerContactRequest,
    CreateContactRequest,
    CreateEmployerSearchRequest,
    DiscoveryConsent,
    EmployerInfo,
    EmployerSearch,
    EmployerSearchMatches,
    UpsertDiscoveryConsentRequest,
    UpdateContactRequest,
)
from .service import EmployerService


def create_employer_router(
    employer: EmployerService,
    sessions: SessionService,
) -> APIRouter:
    router = APIRouter()

    def require_session(x_session_id: str | None = Header(None)) -> str:
        return sessions.require_session(x_session_id)

    def require_employer(x_employer_id: str | None = Header(None)) -> EmployerInfo:
        return employer.require_employer(x_employer_id)

    Session = Annotated[str, Depends(require_session)]
    Employer = Annotated[EmployerInfo, Depends(require_employer)]

    @router.get("/employer/me", tags=["employer"])
    def employer_me(emp: Employer) -> EmployerInfo:
        return emp

    @router.post("/discovery/consent", tags=["discovery"])
    def upsert_discovery_consent(session_id: Session,
                                 req: UpsertDiscoveryConsentRequest) -> DiscoveryConsent:
        return employer.upsert_consent(session_id, req)

    @router.get("/discovery/consent", tags=["discovery"])
    def get_discovery_consent(session_id: Session) -> DiscoveryConsent:
        consent = employer.get_consent(session_id)
        if consent is None:
            return DiscoveryConsent(
                session_id=session_id,
                active=False,
                updated_at="",
            )
        return consent

    @router.delete("/discovery/consent", status_code=204, tags=["discovery"])
    def revoke_discovery_consent(session_id: Session) -> Response:
        employer.revoke_consent(session_id)
        return Response(status_code=204)

    @router.post("/employer/searches", status_code=201, tags=["employer"])
    def create_search(emp: Employer, req: CreateEmployerSearchRequest) -> EmployerSearch:
        return employer.create_search(emp, req)

    @router.get("/employer/searches/{search_id}/matches", tags=["employer"])
    def get_matches(emp: Employer, search_id: str) -> EmployerSearchMatches:
        return employer.search_matches(emp, search_id)

    @router.post("/contact-requests", status_code=201, tags=["contact"])
    def create_contact(emp: Employer, req: CreateContactRequest) -> EmployerContactRequest:
        return employer.create_contact_request(emp, req)

    @router.get("/contact-requests/{contact_id}", tags=["contact"])
    def get_contact(session_id: Session, contact_id: str) -> CandidateContactRequest:
        return employer.get_contact_request(session_id, contact_id)

    @router.patch("/contact-requests/{contact_id}", tags=["contact"])
    def update_contact(session_id: Session, contact_id: str,
                       req: UpdateContactRequest) -> CandidateContactRequest:
        return employer.update_contact_request(session_id, contact_id, req)

    return router
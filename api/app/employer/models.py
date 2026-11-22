from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

EmployerPlan = Literal["free", "paid"]
WorkMode = Literal["onsite", "hybrid", "remote"]
EvidenceState = Literal["supported", "missing", "unknown"]
ContactStatus = Literal["pending", "accepted", "declined", "withdrawn"]


class EmployerInfo(BaseModel):
    id: str
    name: str
    verified: bool
    plan: EmployerPlan
    plan_expires_at: str | None = None


class CandidateProfileRecord(BaseModel):
    session_id: str
    display_name: str
    role: str | None = None
    industry: str | None = None
    location: str | None = None
    province: str | None = "Jujuy"
    country: str | None = "Argentina"
    segment: str | None = None
    work_mode: WorkMode | None = None
    declared_skills: list[str] = Field(default_factory=list)
    is_synthetic: bool = True


class DiscoveryConsent(BaseModel):
    session_id: str
    active: bool
    shared_fields: list[str] = Field(default_factory=list)
    share_portfolio: bool = False
    share_linkedin: bool = False
    share_x: bool = False
    publications_last_7_days: int | None = None
    linkedin_url: str | None = None
    x_url: str | None = None
    revoked_at: str | None = None
    updated_at: str


class UpsertDiscoveryConsentRequest(BaseModel):
    active: bool = True
    shared_fields: list[str] = Field(default_factory=lambda: [
        "display_name", "role", "skills", "portfolio",
    ])
    share_portfolio: bool = True
    share_linkedin: bool = False
    share_x: bool = False
    publications_last_7_days: int | None = None
    linkedin_url: str | None = None
    x_url: str | None = None


class CreateEmployerSearchRequest(BaseModel):
    title: str = Field(min_length=2)
    required_skills: list[str] = Field(min_length=1)
    industry: str | None = None
    location: str | None = "Jujuy, Argentina"
    province: str | None = "Jujuy"
    country: str | None = "Argentina"
    work_mode: WorkMode | None = None
    job_proposal: str | None = None


class EmployerSearch(BaseModel):
    id: str
    employer_id: str
    title: str
    required_skills: list[str]
    industry: str | None = None
    location: str | None = None
    province: str | None = None
    country: str | None = None
    work_mode: WorkMode | None = None
    job_proposal: str | None = None
    created_at: str


class SkillEvidence(BaseModel):
    skill: str
    state: EvidenceState
    achievement_id: str | None = None
    citation: str | None = None


class MatchCard(BaseModel):
    session_id: str
    display_name: str | None = None
    role: str | None = None
    matched_skills: list[str]
    evidence: list[SkillEvidence]
    portfolio_slug: str | None = None
    linkedin_url: str | None = None
    x_url: str | None = None
    publications_last_7_days: int | None = None


class EmployerSearchMatches(BaseModel):
    search_id: str
    employer_plan: EmployerPlan
    eligible_count: int
    matches: list[MatchCard] | None = None
    rule_version: str = "skills_overlap_v1"


class CreateContactRequest(BaseModel):
    search_id: str
    candidate_session_id: str
    message: str = Field(min_length=10, max_length=2000)


class ContactRequest(BaseModel):
    id: str
    employer_id: str
    employer_name: str
    search_id: str
    candidate_session_id: str
    message: str
    status: ContactStatus
    created_at: str
    updated_at: str


class UpdateContactRequest(BaseModel):
    status: ContactStatus


class FreeCountOnly(BaseModel):
    """Respuesta explícita cuando el plan no habilita fichas."""

    eligible_count: int
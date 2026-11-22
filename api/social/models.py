from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class Platform(StrEnum):
    LINKEDIN = "linkedin"
    X = "x"

    @property
    def label(self) -> str:
        return {Platform.LINKEDIN: "LinkedIn", Platform.X: "X"}[self]


class AccessState(StrEnum):
    AVAILABLE = "available"
    CONNECTION_MISSING = "connection_missing"
    RECONNECT_REQUIRED = "reconnect_required"
    ACCESS_UNAVAILABLE = "access_unavailable"


class PublicationStatus(StrEnum):
    PUBLISHING = "publishing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    UNKNOWN = "unknown"


class ErrorInfo(BaseModel):
    code: str
    message: str
    retryable: bool


class AssistedShareSupport(BaseModel):
    official: bool
    attaches_photo: bool


class Availability(BaseModel):
    platform: Platform
    state: AccessState
    can_publish: bool
    can_connect: bool
    assisted_share: AssistedShareSupport
    reason_code: str | None = None
    message: str | None = None


class AssistedShare(BaseModel):
    draft_id: str
    draft_revision: int
    platform: Platform
    text: str
    photo_id: str
    composer_url: str
    official: bool
    attaches_photo: bool
    notice: str


class Publication(BaseModel):
    id: str
    draft_id: str
    draft_revision: int
    platform: Platform
    status: PublicationStatus
    external_id: str | None = None
    url: str | None = None
    error: ErrorInfo | None = None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class PublicationRecord:
    owner_id: str
    idempotency_key: str
    fingerprint: str
    publication: Publication


@dataclass(frozen=True)
class DraftSnapshot:
    id: str
    platform: Platform
    body: str
    revision: int
    photo_id: str


@dataclass(frozen=True)
class Photo:
    content_type: str
    data: bytes = field(repr=False)


@dataclass(frozen=True)
class PublishContent:
    body: str
    photo: Photo


@dataclass(frozen=True)
class Connection:
    platform: Platform
    access_token: str = field(repr=False)
    scopes: frozenset[str] = frozenset()
    expires_at: datetime | None = None


class OutcomeKind(StrEnum):
    SUCCEEDED = "succeeded"
    REJECTED = "rejected"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class ProviderOutcome:
    kind: OutcomeKind
    external_id: str | None = None
    url: str | None = None
    error: ErrorInfo | None = None

    @classmethod
    def succeeded(cls, external_id: str | None, url: str | None = None) -> ProviderOutcome:
        return cls(OutcomeKind.SUCCEEDED, external_id=external_id, url=url)

    @classmethod
    def rejected(cls, code: str, message: str, retryable: bool) -> ProviderOutcome:
        return cls(OutcomeKind.REJECTED, error=ErrorInfo(code=code, message=message, retryable=retryable))

    @classmethod
    def unknown(cls, code: str, message: str) -> ProviderOutcome:
        return cls(OutcomeKind.UNKNOWN, error=ErrorInfo(code=code, message=message, retryable=False))

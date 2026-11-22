from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class Platform(StrEnum):
    LINKEDIN = "linkedin"
    X = "x"

    @property
    def label(self) -> str:
        return {Platform.LINKEDIN: "LinkedIn", Platform.X: "X"}[self]


class ConnectionState(StrEnum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    EXPIRED = "expired"
    ACCESS_UNAVAILABLE = "access_unavailable"


class PublicationStatus(StrEnum):
    PUBLISHING = "publishing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    UNKNOWN = "unknown"


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool


class AssistedShareSupport(BaseModel):
    official: bool
    attaches_photo: bool


class SocialConnectionStatus(BaseModel):
    platform: Platform
    status: ConnectionState
    can_publish_text: bool
    can_publish_image: bool
    account_handle: str | None = None
    reason: str | None = None
    assisted_share: AssistedShareSupport | None = None


class Publication(BaseModel):
    id: str
    draft_id: str
    draft_revision: int
    platform: Platform
    idempotency_key: str
    status: PublicationStatus
    external_post_id: str | None = None
    external_url: str | None = None
    published_at: datetime | None = None
    error: ErrorDetail | None = None


class StartSocialConnectionRequest(BaseModel):
    return_to: str | None = None


class StartSocialConnectionResponse(BaseModel):
    platform: Platform
    authorization_url: str
    state: str


class AssistedShare(BaseModel):
    draft_id: str
    draft_revision: int
    platform: Platform
    text: str
    photo_id: str | None
    composer_url: str
    official: bool
    attaches_photo: bool
    notice: str


@dataclass(frozen=True)
class PublicationRecord:
    owner_id: str
    fingerprint: str
    publication: Publication


@dataclass(frozen=True)
class PublishableMedia:
    photo_id: str
    mime_type: str
    local_path: str
    alt_text: str | None = None


@dataclass(frozen=True)
class PublishableDraft:
    draft_id: str
    draft_revision: int
    platform: Platform
    body: str
    media: PublishableMedia | None = None

    @classmethod
    def from_handoff(cls, payload: Mapping[str, Any]) -> PublishableDraft:
        media = payload.get("media")
        return cls(
            draft_id=payload["draft_id"],
            draft_revision=payload["draft_revision"],
            platform=Platform(payload["platform"]),
            body=payload["body"],
            media=PublishableMedia(**media) if media else None,
        )


@dataclass(frozen=True)
class Connection:
    platform: Platform
    access_token: str = field(repr=False)
    scopes: frozenset[str] = frozenset()
    expires_at: datetime | None = None
    account_id: str | None = None
    account_handle: str | None = None


class OutcomeKind(StrEnum):
    SUCCEEDED = "succeeded"
    REJECTED = "rejected"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class ProviderOutcome:
    kind: OutcomeKind
    external_post_id: str | None = None
    external_url: str | None = None
    error: ErrorDetail | None = None

    @classmethod
    def succeeded(cls, external_post_id: str | None, external_url: str | None = None) -> ProviderOutcome:
        return cls(OutcomeKind.SUCCEEDED, external_post_id=external_post_id, external_url=external_url)

    @classmethod
    def rejected(cls, code: str, message: str, retryable: bool) -> ProviderOutcome:
        return cls(OutcomeKind.REJECTED, error=ErrorDetail(code=code, message=message, retryable=retryable))

    @classmethod
    def unknown(cls, code: str, message: str) -> ProviderOutcome:
        return cls(OutcomeKind.UNKNOWN, error=ErrorDetail(code=code, message=message, retryable=False))

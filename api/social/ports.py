from __future__ import annotations

from typing import Protocol

from .models import Connection, Platform, ProviderOutcome, Publication, PublicationRecord, PublishableDraft


class OAuthError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class ProviderReadError(Exception):
    def __init__(self, code: str, message: str, retryable: bool) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


class PostReader(Protocol):
    def read_recent_posts(self, connection: Connection, limit: int) -> list[str]: ...


class SocialAdapter(Protocol):
    platform: Platform
    required_scopes: frozenset[str]
    supports_image: bool
    supports_read_posts: bool

    def access_unavailable(self) -> str | None: ...

    def publish(self, connection: Connection, draft: PublishableDraft) -> ProviderOutcome: ...

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None: ...


class DraftSource(Protocol):
    def get(self, owner_id: str, draft_id: str) -> PublishableDraft | None: ...


class OAuthProvider(Protocol):
    platform: Platform

    def authorization_url(self, state: str) -> str: ...

    def complete(self, code: str, state: str | None = None) -> Connection: ...


class TokenRefresher(Protocol):
    def refresh(self, connection: Connection) -> Connection: ...


class ConnectionStore(Protocol):
    def get(self, owner_id: str, platform: Platform) -> Connection | None: ...

    def put(self, owner_id: str, connection: Connection) -> None: ...


class PublicationStore(Protocol):
    def get(self, owner_id: str, publication_id: str) -> PublicationRecord | None: ...

    def get_by_key(self, owner_id: str, idempotency_key: str) -> PublicationRecord | None: ...

    def latest_for_draft(self, owner_id: str, draft_id: str) -> PublicationRecord | None: ...

    def save(self, record: PublicationRecord) -> None: ...

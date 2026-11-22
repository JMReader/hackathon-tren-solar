from __future__ import annotations

from typing import Protocol

from .models import Connection, Platform, ProviderOutcome, Publication, PublicationRecord, PublishableDraft


class SocialAdapter(Protocol):
    platform: Platform
    required_scopes: frozenset[str]
    supports_image: bool

    def access_unavailable(self) -> str | None: ...

    def publish(self, connection: Connection, draft: PublishableDraft) -> ProviderOutcome: ...

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None: ...


class DraftSource(Protocol):
    def get(self, owner_id: str, draft_id: str) -> PublishableDraft | None: ...


class ConnectionStore(Protocol):
    def get(self, owner_id: str, platform: Platform) -> Connection | None: ...


class PublicationStore(Protocol):
    def get(self, owner_id: str, publication_id: str) -> PublicationRecord | None: ...

    def get_by_key(self, owner_id: str, idempotency_key: str) -> PublicationRecord | None: ...

    def latest_for_draft(self, owner_id: str, draft_id: str) -> PublicationRecord | None: ...

    def save(self, record: PublicationRecord) -> None: ...

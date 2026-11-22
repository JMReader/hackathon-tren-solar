from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import pytest
from social.memory import InMemoryConnectionStore, InMemoryPublicationStore
from social.models import (
    Connection,
    DraftSnapshot,
    ErrorInfo,
    Photo,
    Platform,
    ProviderOutcome,
    Publication,
    PublishContent,
)
from social.service import SocialService

OWNER = "owner-1"
NOW = datetime(2026, 11, 22, 15, 0, tzinfo=UTC)


class FakeAdapter:
    def __init__(self, platform: Platform) -> None:
        self.platform = platform
        self.required_scopes = frozenset({"write"})
        self.block: ErrorInfo | None = None
        self.outcome: ProviderOutcome | Exception = ProviderOutcome.succeeded(
            f"{platform}-post-1", f"https://example.test/{platform}/post-1"
        )
        self.lookup_outcome: ProviderOutcome | None = None
        self.before_publish = lambda: None
        self.published: list[PublishContent] = []

    def access_unavailable(self) -> ErrorInfo | None:
        return self.block

    def publish(self, connection: Connection, content: PublishContent) -> ProviderOutcome:
        self.before_publish()
        self.published.append(content)
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None:
        return self.lookup_outcome


class DictSource(dict):
    def get(self, owner_id: str, item_id: str):  # type: ignore[override]
        return super().get((owner_id, item_id))


@dataclass
class Env:
    service: SocialService
    adapters: dict[Platform, FakeAdapter]
    connections: InMemoryConnectionStore
    drafts: DictSource
    photos: DictSource
    clock: list[datetime] = field(default_factory=lambda: [NOW])

    def connect(self, platform: Platform, owner: str = OWNER, **kwargs) -> None:
        kwargs.setdefault("scopes", frozenset({"write"}))
        self.connections.put(owner, Connection(platform=platform, access_token="secret", **kwargs))

    def add_draft(
        self, draft_id: str, platform: Platform, owner: str = OWNER, revision: int = 1, body: str | None = None
    ) -> None:
        self.drafts[(owner, draft_id)] = DraftSnapshot(
            draft_id, platform, body or f"Texto {draft_id}", revision, "photo-1"
        )
        self.photos[(owner, "photo-1")] = Photo("image/jpeg", b"jpeg")

    def advance(self, minutes: int = 1) -> None:
        self.clock[0] += timedelta(minutes=minutes)


@pytest.fixture
def env() -> Env:
    adapters = {platform: FakeAdapter(platform) for platform in Platform}
    connections = InMemoryConnectionStore()
    drafts, photos = DictSource(), DictSource()
    clock = [NOW]
    ids = iter(f"pub-{n}" for n in range(1, 1000))
    service = SocialService(
        adapters,
        connections,
        InMemoryPublicationStore(),
        drafts,
        photos,
        clock=lambda: clock[0],
        new_id=lambda: next(ids),
    )
    return Env(service, adapters, connections, drafts, photos, clock)

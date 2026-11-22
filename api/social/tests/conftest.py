from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import pytest
from social.crypto import TokenCipher
from social.memory import InMemoryConnectionStore, InMemoryPublicationStore
from social.models import Connection, Platform, ProviderOutcome, Publication, PublishableDraft, PublishableMedia
from social.service import SocialService

OWNER = "owner-1"
NOW = datetime(2026, 11, 22, 15, 0, tzinfo=UTC)
KEY = "key-00000001"
FIXTURES = Path(__file__).resolve().parents[3] / "contracts" / "fixtures"


def fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


class FakeAdapter:
    def __init__(self, platform: Platform) -> None:
        self.platform = platform
        self.required_scopes = frozenset({"write"})
        self.supports_image = True
        self.reason: str | None = None
        self.outcome: ProviderOutcome | Exception = ProviderOutcome.succeeded(
            f"{platform}-post-1", f"https://example.test/{platform}/post-1"
        )
        self.lookup_outcome: ProviderOutcome | None = None
        self.before_publish = lambda: None
        self.published: list[PublishableDraft] = []

    def access_unavailable(self) -> str | None:
        return self.reason

    def publish(self, connection: Connection, draft: PublishableDraft) -> ProviderOutcome:
        self.before_publish()
        self.published.append(draft)
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome

    def lookup(self, connection: Connection, publication: Publication) -> ProviderOutcome | None:
        return self.lookup_outcome


class DraftsByOwner(dict):
    def get(self, owner_id: str, draft_id: str) -> PublishableDraft | None:  # type: ignore[override]
        return super().get((owner_id, draft_id))


@dataclass
class Env:
    service: SocialService
    adapters: dict[Platform, FakeAdapter]
    connections: InMemoryConnectionStore
    drafts: DraftsByOwner
    clock: list[datetime] = field(default_factory=lambda: [NOW])

    def connect(self, platform: Platform, owner: str = OWNER, **kwargs) -> None:
        kwargs.setdefault("scopes", frozenset({"write"}))
        self.connections.put(owner, Connection(platform=platform, access_token="secret", **kwargs))

    def add_draft(
        self,
        draft_id: str,
        platform: Platform,
        owner: str = OWNER,
        revision: int = 1,
        body: str | None = None,
        with_photo: bool = True,
    ) -> None:
        media = PublishableMedia("med_1", "image/jpeg", "/private/med_1.jpg") if with_photo else None
        self.drafts[(owner, draft_id)] = PublishableDraft(
            draft_id, revision, platform, body or f"Texto {draft_id}", media
        )


@pytest.fixture
def env() -> Env:
    adapters = {platform: FakeAdapter(platform) for platform in Platform}
    connections = InMemoryConnectionStore(TokenCipher(TokenCipher.generate_key()))
    drafts = DraftsByOwner()
    clock = [NOW]
    ids = iter(f"pub-{n}" for n in range(1, 1000))
    service = SocialService(
        adapters,
        connections,
        InMemoryPublicationStore(),
        drafts,
        clock=lambda: clock[0],
        new_id=lambda: next(ids),
    )
    return Env(service, adapters, connections, drafts, clock)

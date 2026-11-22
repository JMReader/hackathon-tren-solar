from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import httpx2

from social.crypto import TokenCipher
from social.models import Platform, PublishableDraft
from social.oauth import ConnectionFlow
from social.pg_store import PgConnectionStore, PgDatabase, PgOAuthStateStore, PgPublicationStore
from social.service import SocialService
from social.settings import Settings as SocialSettings
from social.sqlite import SqliteConnectionStore, SqliteDatabase, SqlitePublicationStore
from social.wiring import build_providers

from .errors import ApiError
from .service import CoreService
from .style_reader import StyleOutcome


class CoreDraftSource:
    def __init__(self, core: CoreService) -> None:
        self._core = core

    def get(self, owner_id: str, draft_id: str) -> PublishableDraft | None:
        try:
            draft = self._core.get_draft(owner_id, draft_id)
        except ApiError as error:
            if error.http_status == 404:
                return None
            raise
        return PublishableDraft.from_handoff(self._core.get_publishable_draft(draft_id, draft.revision))


class SocialStyleReader:
    def __init__(self, social: SocialService) -> None:
        self._social = social

    def fetch_recent_posts(
        self, session_id: str, platform: str, max_posts: int, profile_url: str | None = None
    ) -> StyleOutcome:
        result = self._social.recent_posts(session_id, Platform(platform), max_posts, profile_url)
        return StyleOutcome(status=result.status.value, posts=list(result.posts), message=result.message)


@dataclass(frozen=True)
class SocialModule:
    service: SocialService
    flow: ConnectionFlow


def build_social(
    core: CoreService,
    data_dir: Path,
    settings: SocialSettings | None = None,
    http: httpx2.Client | None = None,
    pg_dsn: str | None = None,
) -> SocialModule:
    settings = settings or SocialSettings.from_env()
    cipher = TokenCipher(settings.token_key or TokenCipher.generate_key())
    if pg_dsn:
        db = PgDatabase(pg_dsn)
        store = PgConnectionStore(db, cipher)
        publications = PgPublicationStore(db)
        state_store = PgOAuthStateStore(db)
    else:
        db = SqliteDatabase(data_dir / "social.db")
        store = SqliteConnectionStore(db, cipher)
        publications = SqlitePublicationStore(db)
        state_store = None
    providers = build_providers(settings, store, http or httpx2.Client(timeout=httpx2.Timeout(20.0, connect=5.0)))
    service = SocialService(providers.adapters, providers.connections, publications, CoreDraftSource(core))
    flow = ConnectionFlow(
        service, providers.oauth, providers.connections, settings.web_base_url, state_store=state_store
    )
    return SocialModule(service, flow)

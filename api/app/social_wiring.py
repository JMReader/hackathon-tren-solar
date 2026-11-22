from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import httpx2

from social.adapters import default_adapters
from social.crypto import TokenCipher
from social.linkedin import LinkedInAdapter
from social.models import ConnectionState, Platform, PublishableDraft
from social.oauth import ConnectionFlow
from social.service import SocialService
from social.settings import Settings as SocialSettings
from social.sqlite import SqliteConnectionStore, SqliteDatabase, SqlitePublicationStore

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

    def fetch_recent_posts(self, session_id: str, platform: str, max_posts: int) -> StyleOutcome:
        network = Platform(platform)
        status = self._social.connection_status(session_id, network)
        if status.status is not ConnectionState.CONNECTED:
            return StyleOutcome(status="skipped", message=status.reason)
        if not status.can_read_posts:
            return StyleOutcome(
                status="unavailable",
                message=f"{network.label} no permite leer tus posts desde la app. Usá la muestra de escritura.",
            )
        return StyleOutcome(status="unavailable", message="La lectura de posts todavía no está implementada.")


@dataclass(frozen=True)
class SocialModule:
    service: SocialService
    flow: ConnectionFlow


def build_social(
    core: CoreService,
    data_dir: Path,
    settings: SocialSettings | None = None,
    http: httpx2.Client | None = None,
) -> SocialModule:
    settings = settings or SocialSettings.from_env()
    db = SqliteDatabase(data_dir / "social.db")
    connections = SqliteConnectionStore(db, TokenCipher(settings.token_key or TokenCipher.generate_key()))
    linkedin = (
        LinkedInAdapter(settings.linkedin, http or httpx2.Client(timeout=httpx2.Timeout(20.0, connect=5.0)))
        if settings.linkedin
        else None
    )
    service = SocialService(
        default_adapters(linkedin), connections, SqlitePublicationStore(db), CoreDraftSource(core)
    )
    flow = ConnectionFlow(
        service, {Platform.LINKEDIN: linkedin} if linkedin else {}, connections, settings.web_base_url
    )
    return SocialModule(service, flow)

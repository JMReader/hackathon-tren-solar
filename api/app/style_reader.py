from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from .models import Platform


@dataclass
class StyleOutcome:
    """Resultado de leer posts propios de una red (implementado por Issue #5)."""

    status: str  # skipped | succeeded | unavailable | failed
    posts: list[str] = field(default_factory=list)
    message: str | None = None


class StyleReaderPort(Protocol):
    """Lectura de posts propios para voice_context. La implementación real
    vive en `api/social` (Issue #5, Mayko) usando OAuth + can_read_posts."""

    def fetch_recent_posts(self, session_id: str, platform: Platform,
                           max_posts: int,
                           profile_url: str | None = None) -> StyleOutcome:
        ...


class FakeStyleReader:
    """Default local: simula `can_read_posts=false` (unavailable).

    Para demos se pueden inyectar posts con `FAKE_STYLE_POSTS` (JSON
    {"linkedin": [...], "x": [...]}) en el entorno.
    """

    def __init__(self, posts: dict[str, list[str]] | None = None):
        self.posts = posts or {}

    def fetch_recent_posts(self, session_id: str, platform: Platform,
                           max_posts: int,
                           profile_url: str | None = None) -> StyleOutcome:
        available = self.posts.get(platform, [])
        if not available:
            return StyleOutcome(status="unavailable",
                                message="can_read_posts es false en este entorno")
        return StyleOutcome(status="succeeded", posts=available[:max_posts])


def build_style_reader(env_posts_json: str | None = None) -> StyleReaderPort:
    import json

    posts = None
    if env_posts_json:
        try:
            posts = json.loads(env_posts_json)
        except json.JSONDecodeError:
            posts = None
    return FakeStyleReader(posts)

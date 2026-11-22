from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path

from .models import Achievement, AuthorProfile, CvDocument, Draft, MediaAsset


class Store:
    """Persistencia SQLite local. JSON en columnas para facts/questions/ids/context."""

    def __init__(self, db_path: Path | str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions(
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS author_profiles(
                    session_id TEXT PRIMARY KEY,
                    revision INTEGER NOT NULL,
                    onboarding_status TEXT NOT NULL,
                    profession TEXT,
                    photo_id TEXT,
                    writing_sample TEXT,
                    cv_id TEXT,
                    sample_posts TEXT NOT NULL,
                    voice_context TEXT,
                    style_sync TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS cv_documents(
                    cv_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    size_bytes INTEGER,
                    local_path TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS media(
                    photo_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    alt_text TEXT,
                    size_bytes INTEGER,
                    local_path TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS achievements(
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    input_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    photo_id TEXT,
                    transcript TEXT NOT NULL,
                    facts TEXT NOT NULL,
                    open_questions TEXT NOT NULL,
                    error TEXT,
                    source_metadata TEXT,
                    audio_path TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS drafts(
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    achievement_id TEXT NOT NULL,
                    achievement_revision INTEGER NOT NULL,
                    platform TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    photo_id TEXT,
                    body TEXT NOT NULL,
                    char_count INTEGER NOT NULL,
                    max_chars INTEGER NOT NULL,
                    used_fact_ids TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS portfolios(
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    display_name TEXT NOT NULL,
                    headline TEXT,
                    items TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    palette_id TEXT NOT NULL,
                    cv_downloadable INTEGER NOT NULL DEFAULT 0,
                    slug TEXT UNIQUE,
                    published_revision INTEGER,
                    published_snapshot TEXT,
                    published_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS pro_interest_events(
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    response TEXT NOT NULL,
                    trigger TEXT,
                    item_id TEXT,
                    price_band_ars_month TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )
            self._migrate_schema(conn)

    @staticmethod
    def _migrate_schema(conn: sqlite3.Connection) -> None:
        """Columnas session_id añadidas tras el primer cut; IF NOT EXISTS no altera tablas viejas."""
        for table in ("media", "achievements", "drafts"):
            cols = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
            if cols and "session_id" not in cols:
                conn.execute(
                    f"ALTER TABLE {table} ADD COLUMN session_id TEXT NOT NULL DEFAULT ''"
                )

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # --- sessions ---

    def save_session(self, session_id: str, created_at: str, expires_at: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute("INSERT INTO sessions VALUES (?,?,?)",
                         (session_id, created_at, expires_at))

    def get_session(self, session_id: str) -> sqlite3.Row | None:
        with self._conn() as conn:
            return conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()

    # --- author_profiles ---

    def save_profile(self, profile: AuthorProfile, sample_posts: dict,
                     updated_at: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO author_profiles
                   (session_id,revision,onboarding_status,profession,photo_id,
                    writing_sample,cv_id,sample_posts,voice_context,style_sync,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    profile.session_id, profile.revision, profile.onboarding_status,
                    profile.profession, profile.photo_id, profile.writing_sample,
                    profile.cv_document.cv_id if profile.cv_document else None,
                    json.dumps(sample_posts, ensure_ascii=False),
                    json.dumps(profile.voice_context.model_dump(), ensure_ascii=False)
                    if profile.voice_context else None,
                    json.dumps(profile.style_sync.model_dump(), ensure_ascii=False),
                    updated_at,
                ),
            )

    def get_profile(self, session_id: str) -> tuple[AuthorProfile, dict] | None:
        """Devuelve (AuthorProfile, sample_posts dict por plataforma)."""
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM author_profiles WHERE session_id=?", (session_id,)).fetchone()
        if row is None:
            return None
        cv_document = None
        if row["cv_id"]:
            cv = self.get_cv(row["cv_id"])
            if cv:
                cv_document = CvDocument(cv_id=cv["cv_id"], mime_type=cv["mime_type"],
                                         size_bytes=cv["size_bytes"])
        profile = AuthorProfile(
            session_id=row["session_id"],
            onboarding_status=row["onboarding_status"],
            revision=row["revision"],
            ready_for_achievement=_ready(
                row["onboarding_status"],
                row["profession"],
                row["photo_id"],
                row["writing_sample"],
                json.loads(row["sample_posts"]),
            ),
            profession=row["profession"],
            photo_id=row["photo_id"],
            writing_sample=row["writing_sample"],
            cv_document=cv_document,
            voice_context=json.loads(row["voice_context"]) if row["voice_context"] else None,
            style_sync=json.loads(row["style_sync"]),
        )
        return profile, json.loads(row["sample_posts"])

    # --- cv_documents ---

    def save_cv(self, cv_id: str, session_id: str, mime_type: str,
                size_bytes: int, local_path: str, created_at: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute("INSERT INTO cv_documents VALUES (?,?,?,?,?,?)",
                         (cv_id, session_id, mime_type, size_bytes, local_path, created_at))

    def get_cv(self, cv_id: str) -> sqlite3.Row | None:
        with self._conn() as conn:
            return conn.execute("SELECT * FROM cv_documents WHERE cv_id=?", (cv_id,)).fetchone()

    # --- media ---

    def save_media(self, photo_id: str, session_id: str, mime_type: str,
                   alt_text: str | None, size_bytes: int, local_path: str,
                   created_at: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT INTO media
                   (photo_id,session_id,mime_type,alt_text,size_bytes,local_path,created_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (photo_id, session_id, mime_type, alt_text,
                 size_bytes, local_path, created_at),
            )

    def get_media(self, photo_id: str) -> MediaAsset | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM media WHERE photo_id=?", (photo_id,)).fetchone()
        if row is None:
            return None
        return MediaAsset(photo_id=row["photo_id"], mime_type=row["mime_type"],
                          alt_text=row["alt_text"], size_bytes=row["size_bytes"])

    def media_local_path(self, photo_id: str) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT local_path FROM media WHERE photo_id=?",
                               (photo_id,)).fetchone()
        return row["local_path"] if row else None

    def media_session(self, photo_id: str) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT session_id FROM media WHERE photo_id=?",
                               (photo_id,)).fetchone()
        return row["session_id"] if row else None

    # --- achievements ---

    def save_achievement(self, a: Achievement, session_id: str,
                         source_metadata: dict | None, audio_path: str | None,
                         now: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO achievements
                   (id,session_id,input_type,status,revision,photo_id,transcript,facts,
                    open_questions,error,source_metadata,audio_path,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    a.id, session_id, a.input_type, a.status, a.revision, a.photo_id,
                    a.transcript,
                    json.dumps([f.model_dump() for f in a.facts], ensure_ascii=False),
                    json.dumps([q.model_dump() for q in a.open_questions], ensure_ascii=False),
                    json.dumps(a.error.model_dump(), ensure_ascii=False) if a.error else None,
                    json.dumps(source_metadata, ensure_ascii=False) if source_metadata else None,
                    audio_path, now, now,
                ),
            )

    def get_achievement(self, achievement_id: str) -> Achievement | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM achievements WHERE id=?",
                               (achievement_id,)).fetchone()
        return self._row_to_achievement(row) if row else None

    def achievement_session(self, achievement_id: str) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT session_id FROM achievements WHERE id=?",
                               (achievement_id,)).fetchone()
        return row["session_id"] if row else None

    def achievement_audio_path(self, achievement_id: str) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT audio_path FROM achievements WHERE id=?",
                               (achievement_id,)).fetchone()
        return row["audio_path"] if row else None

    def achievement_source_metadata(self, achievement_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute("SELECT source_metadata FROM achievements WHERE id=?",
                               (achievement_id,)).fetchone()
        return json.loads(row["source_metadata"]) if row and row["source_metadata"] else None

    def _row_to_achievement(self, row: sqlite3.Row) -> Achievement:
        return Achievement(
            id=row["id"],
            input_type=row["input_type"],
            status=row["status"],
            revision=row["revision"],
            photo_id=row["photo_id"],
            transcript=row["transcript"],
            facts=json.loads(row["facts"]),
            open_questions=json.loads(row["open_questions"]),
            error=json.loads(row["error"]) if row["error"] else None,
        )

    # --- drafts ---

    def save_draft(self, d: Draft, session_id: str, now: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO drafts
                   (id,session_id,achievement_id,achievement_revision,platform,revision,
                    status,photo_id,body,char_count,max_chars,used_fact_ids,
                    created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    d.id, session_id, d.achievement_id, d.achievement_revision, d.platform,
                    d.revision, d.status, d.photo_id, d.body, d.char_count, d.max_chars,
                    json.dumps(d.used_fact_ids, ensure_ascii=False), now, now,
                ),
            )

    def get_draft(self, draft_id: str) -> Draft | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM drafts WHERE id=?", (draft_id,)).fetchone()
        if row is None:
            return None
        return Draft(
            id=row["id"], achievement_id=row["achievement_id"],
            achievement_revision=row["achievement_revision"], platform=row["platform"],
            revision=row["revision"], status=row["status"], photo_id=row["photo_id"],
            body=row["body"], char_count=row["char_count"], max_chars=row["max_chars"],
            used_fact_ids=json.loads(row["used_fact_ids"]),
        )

    def draft_session(self, draft_id: str) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT session_id FROM drafts WHERE id=?",
                               (draft_id,)).fetchone()
        return row["session_id"] if row else None

    # --- portfolios (Issue #6) ---

    def save_portfolio(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO portfolios
                   (id,session_id,status,revision,display_name,headline,items,
                    template_id,palette_id,cv_downloadable,slug,published_revision,
                    published_snapshot,published_at,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    row["id"], row["session_id"], row["status"], row["revision"],
                    row["display_name"], row["headline"], row["items"],
                    row["template_id"], row["palette_id"], row["cv_downloadable"],
                    row["slug"], row["published_revision"], row["published_snapshot"],
                    row["published_at"], row["created_at"], row["updated_at"],
                ),
            )

    def get_portfolio(self, portfolio_id: str) -> sqlite3.Row | None:
        with self._conn() as conn:
            return conn.execute(
                "SELECT * FROM portfolios WHERE id=?", (portfolio_id,)).fetchone()

    def get_portfolio_by_slug(self, slug: str) -> sqlite3.Row | None:
        with self._conn() as conn:
            return conn.execute(
                "SELECT * FROM portfolios WHERE slug=?", (slug,)).fetchone()

    def portfolio_slug_taken(self, slug: str, exclude_id: str | None = None) -> bool:
        with self._conn() as conn:
            if exclude_id:
                row = conn.execute(
                    "SELECT 1 FROM portfolios WHERE slug=? AND id<>?",
                    (slug, exclude_id),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT 1 FROM portfolios WHERE slug=?", (slug,),
                ).fetchone()
        return row is not None

    def save_pro_interest_event(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT INTO pro_interest_events
                   (id,session_id,response,trigger,item_id,price_band_ars_month,created_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (
                    row["id"], row["session_id"], row["response"], row["trigger"],
                    row["item_id"], row["price_band_ars_month"], row["created_at"],
                ),
            )


def _ready(
    onboarding_status: str,
    profession: str | None,
    photo_id: str | None,
    writing_sample: str | None,
    sample_posts: dict,
) -> bool:
    """Listo para POST /achievements: onboarding complete + campos (OB-2)."""
    if onboarding_status != "complete":
        return False
    has_posts = any(sample_posts.get(p) for p in ("linkedin", "x"))
    has_sample = bool(writing_sample) and len(writing_sample) >= 20
    return bool(profession) and bool(photo_id) and (has_posts or has_sample)

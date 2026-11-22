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
                CREATE TABLE IF NOT EXISTS candidate_profiles(
                    session_id TEXT PRIMARY KEY,
                    display_name TEXT NOT NULL,
                    role TEXT,
                    industry TEXT,
                    location TEXT,
                    work_mode TEXT,
                    declared_skills TEXT NOT NULL DEFAULT '[]',
                    is_synthetic INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS discovery_consents(
                    session_id TEXT PRIMARY KEY,
                    active INTEGER NOT NULL,
                    shared_fields TEXT NOT NULL,
                    share_portfolio INTEGER NOT NULL DEFAULT 0,
                    share_linkedin INTEGER NOT NULL DEFAULT 0,
                    share_x INTEGER NOT NULL DEFAULT 0,
                    publications_last_7_days INTEGER,
                    linkedin_url TEXT,
                    x_url TEXT,
                    revoked_at TEXT,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS employers(
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    verified INTEGER NOT NULL DEFAULT 0,
                    plan TEXT NOT NULL DEFAULT 'free',
                    plan_expires_at TEXT
                );
                CREATE TABLE IF NOT EXISTS employer_searches(
                    id TEXT PRIMARY KEY,
                    employer_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    required_skills TEXT NOT NULL,
                    industry TEXT,
                    location TEXT,
                    work_mode TEXT,
                    job_proposal TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS contact_requests(
                    id TEXT PRIMARY KEY,
                    employer_id TEXT NOT NULL,
                    search_id TEXT NOT NULL,
                    candidate_session_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
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

    def list_achievements(self, session_id: str) -> list[Achievement]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM achievements WHERE session_id=? ORDER BY updated_at DESC",
                (session_id,),
            ).fetchall()
        return [self._row_to_achievement(row) for row in rows]

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

    # --- empresas (#9–#12) ---

    def save_candidate_profile(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO candidate_profiles
                   (session_id,display_name,role,industry,location,work_mode,
                    declared_skills,is_synthetic)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    row["session_id"], row["display_name"], row.get("role"),
                    row.get("industry"), row.get("location"), row.get("work_mode"),
                    json.dumps(row.get("declared_skills") or [], ensure_ascii=False),
                    1 if row.get("is_synthetic", True) else 0,
                ),
            )

    def get_candidate_profile(self, session_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM candidate_profiles WHERE session_id=?", (session_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "session_id": row["session_id"],
            "display_name": row["display_name"],
            "role": row["role"],
            "industry": row["industry"],
            "location": row["location"],
            "work_mode": row["work_mode"],
            "declared_skills": json.loads(row["declared_skills"]),
            "is_synthetic": bool(row["is_synthetic"]),
        }

    def save_discovery_consent(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO discovery_consents
                   (session_id,active,shared_fields,share_portfolio,share_linkedin,
                    share_x,publications_last_7_days,linkedin_url,x_url,revoked_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    row["session_id"], 1 if row["active"] else 0,
                    json.dumps(row.get("shared_fields") or [], ensure_ascii=False),
                    1 if row.get("share_portfolio") else 0,
                    1 if row.get("share_linkedin") else 0,
                    1 if row.get("share_x") else 0,
                    row.get("publications_last_7_days"),
                    row.get("linkedin_url"), row.get("x_url"),
                    row.get("revoked_at"), row["updated_at"],
                ),
            )

    def get_discovery_consent(self, session_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM discovery_consents WHERE session_id=?", (session_id,),
            ).fetchone()
        return self._discovery_row(row) if row else None

    def list_active_discovery_consents(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM discovery_consents WHERE active=1",
            ).fetchall()
        return [self._discovery_row(r) for r in rows]

    @staticmethod
    def _discovery_row(row: sqlite3.Row) -> dict:
        return {
            "session_id": row["session_id"],
            "active": bool(row["active"]),
            "shared_fields": json.loads(row["shared_fields"]),
            "share_portfolio": bool(row["share_portfolio"]),
            "share_linkedin": bool(row["share_linkedin"]),
            "share_x": bool(row["share_x"]),
            "publications_last_7_days": row["publications_last_7_days"],
            "linkedin_url": row["linkedin_url"],
            "x_url": row["x_url"],
            "revoked_at": row["revoked_at"],
            "updated_at": row["updated_at"],
        }

    def save_employer(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO employers
                   (id,name,verified,plan,plan_expires_at) VALUES (?,?,?,?,?)""",
                (row["id"], row["name"], 1 if row.get("verified") else 0,
                 row.get("plan", "free"), row.get("plan_expires_at")),
            )

    def get_employer(self, employer_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM employers WHERE id=?", (employer_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"], "name": row["name"],
            "verified": bool(row["verified"]),
            "plan": row["plan"],
            "plan_expires_at": row["plan_expires_at"],
        }

    def save_employer_search(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO employer_searches
                   (id,employer_id,title,required_skills,industry,location,
                    work_mode,job_proposal,created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    row["id"], row["employer_id"], row["title"],
                    json.dumps(row["required_skills"], ensure_ascii=False),
                    row.get("industry"), row.get("location"), row.get("work_mode"),
                    row.get("job_proposal"), row["created_at"],
                ),
            )

    def get_employer_search(self, search_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM employer_searches WHERE id=?", (search_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"], "employer_id": row["employer_id"],
            "title": row["title"],
            "required_skills": json.loads(row["required_skills"]),
            "industry": row["industry"], "location": row["location"],
            "work_mode": row["work_mode"], "job_proposal": row["job_proposal"],
            "created_at": row["created_at"],
        }

    def save_contact_request(self, row: dict) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO contact_requests
                   (id,employer_id,search_id,candidate_session_id,message,status,
                    created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    row["id"], row["employer_id"], row["search_id"],
                    row["candidate_session_id"], row["message"], row["status"],
                    row["created_at"], row["updated_at"],
                ),
            )

    def get_contact_request(self, contact_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM contact_requests WHERE id=?", (contact_id,),
            ).fetchone()
        if row is None:
            return None
        return dict(row)

    def get_published_portfolio_for_session(self, session_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                """SELECT slug FROM portfolios
                   WHERE session_id=? AND status='published' AND slug IS NOT NULL
                   ORDER BY published_at DESC LIMIT 1""",
                (session_id,),
            ).fetchone()
        return {"slug": row["slug"]} if row else None


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

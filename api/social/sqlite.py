from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator

from .crypto import TokenCipher
from .models import Connection, Platform, Publication, PublicationRecord

SCHEMA = """
CREATE TABLE IF NOT EXISTS social_connections (
    owner_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    encrypted_token BLOB NOT NULL,
    scopes TEXT NOT NULL,
    expires_at TEXT,
    account_id TEXT,
    account_handle TEXT,
    encrypted_refresh_token BLOB,
    PRIMARY KEY (owner_id, platform)
);
CREATE TABLE IF NOT EXISTS social_publications (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    draft_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    publication TEXT NOT NULL,
    UNIQUE (owner_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS social_publications_by_draft ON social_publications (owner_id, draft_id);
"""


class SqliteDatabase:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        with self.connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(SCHEMA)
            columns = {row["name"] for row in conn.execute("PRAGMA table_info(social_connections)")}
            if "encrypted_refresh_token" not in columns:
                conn.execute("ALTER TABLE social_connections ADD COLUMN encrypted_refresh_token BLOB")

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA synchronous=NORMAL")
            try:
                with conn:
                    yield conn
            finally:
                conn.close()


class SqliteConnectionStore:
    def __init__(self, db: SqliteDatabase, cipher: TokenCipher) -> None:
        self._db = db
        self._cipher = cipher

    def get(self, owner_id: str, platform: Platform) -> Connection | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM social_connections WHERE owner_id = ? AND platform = ?", (owner_id, platform.value)
            ).fetchone()
        if row is None:
            return None
        try:
            token = self._cipher.decrypt(row["encrypted_token"])
            refresh = row["encrypted_refresh_token"]
            refresh_token = self._cipher.decrypt(refresh) if refresh else None
        except ValueError:
            return None
        return Connection(
            platform=platform,
            access_token=token,
            scopes=frozenset(json.loads(row["scopes"])),
            expires_at=datetime.fromisoformat(row["expires_at"]) if row["expires_at"] else None,
            account_id=row["account_id"],
            account_handle=row["account_handle"],
            refresh_token=refresh_token,
        )

    def put(self, owner_id: str, connection: Connection) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO social_connections (owner_id, platform, encrypted_token, scopes, expires_at,
                    account_id, account_handle, encrypted_refresh_token)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    owner_id,
                    connection.platform.value,
                    self._cipher.encrypt(connection.access_token),
                    json.dumps(sorted(connection.scopes)),
                    connection.expires_at.isoformat() if connection.expires_at else None,
                    connection.account_id,
                    connection.account_handle,
                    self._cipher.encrypt(connection.refresh_token) if connection.refresh_token else None,
                ),
            )


class SqlitePublicationStore:
    def __init__(self, db: SqliteDatabase) -> None:
        self._db = db

    def get(self, owner_id: str, publication_id: str) -> PublicationRecord | None:
        return self._one("id = ? AND owner_id = ?", (publication_id, owner_id))

    def get_by_key(self, owner_id: str, idempotency_key: str) -> PublicationRecord | None:
        return self._one("owner_id = ? AND idempotency_key = ?", (owner_id, idempotency_key))

    def latest_for_draft(self, owner_id: str, draft_id: str) -> PublicationRecord | None:
        return self._one("owner_id = ? AND draft_id = ? ORDER BY rowid DESC LIMIT 1", (owner_id, draft_id))

    def save(self, record: PublicationRecord) -> None:
        publication = record.publication
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO social_publications (id, owner_id, idempotency_key, draft_id, fingerprint, publication)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET publication = excluded.publication
                """,
                (
                    publication.id,
                    record.owner_id,
                    publication.idempotency_key,
                    publication.draft_id,
                    record.fingerprint,
                    publication.model_dump_json(),
                ),
            )

    def _one(self, where: str, params: tuple[str, ...]) -> PublicationRecord | None:
        with self._db.connect() as conn:
            row = conn.execute(f"SELECT * FROM social_publications WHERE {where}", params).fetchone()
        if row is None:
            return None
        return PublicationRecord(
            owner_id=row["owner_id"],
            fingerprint=row["fingerprint"],
            publication=Publication.model_validate_json(row["publication"]),
        )

from __future__ import annotations

import json
import threading
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from app.db_postgres import clean_pg_dsn

from .crypto import TokenCipher
from .models import Connection, Platform, Publication, PublicationRecord


class PgDatabase:
    def __init__(self, dsn: str) -> None:
        self.dsn = clean_pg_dsn(dsn)
        self._lock = threading.Lock()

    @contextmanager
    def connect(self) -> Iterator[psycopg.Connection]:
        with self._lock:
            conn = psycopg.connect(self.dsn, autocommit=True,
                                   row_factory=dict_row, prepare_threshold=None)
            try:
                yield conn
            finally:
                conn.close()


class PgConnectionStore:
    def __init__(self, db: PgDatabase, cipher: TokenCipher) -> None:
        self._db = db
        self._cipher = cipher

    def get(self, owner_id: str, platform: Platform) -> Connection | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM social_connections WHERE owner_id = %s AND platform = %s",
                (owner_id, platform.value),
            ).fetchone()
        if row is None:
            return None
        try:
            token = self._cipher.decrypt(bytes(row["encrypted_token"]))
            refresh = row.get("encrypted_refresh_token")
            refresh_token = self._cipher.decrypt(bytes(refresh)) if refresh else None
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
        columns = ["owner_id", "platform", "encrypted_token", "scopes", "expires_at", "account_id", "account_handle"]
        values = [
            owner_id,
            connection.platform.value,
            self._cipher.encrypt(connection.access_token),
            json.dumps(sorted(connection.scopes)),
            connection.expires_at.isoformat() if connection.expires_at else None,
            connection.account_id,
            connection.account_handle,
        ]
        if connection.refresh_token is not None:
            columns.append("encrypted_refresh_token")
            values.append(self._cipher.encrypt(connection.refresh_token))
        updates = ", ".join(f"{column}=EXCLUDED.{column}" for column in columns[2:])
        with self._db.connect() as conn:
            conn.execute(
                f"INSERT INTO social_connections ({', '.join(columns)}) "
                f"VALUES ({', '.join(['%s'] * len(columns))}) "
                f"ON CONFLICT (owner_id, platform) DO UPDATE SET {updates}",
                values,
            )


class PgPublicationStore:
    def __init__(self, db: PgDatabase) -> None:
        self._db = db

    def get(self, owner_id: str, publication_id: str) -> PublicationRecord | None:
        return self._one("id = %s AND owner_id = %s", (publication_id, owner_id))

    def get_by_key(self, owner_id: str, idempotency_key: str) -> PublicationRecord | None:
        return self._one("owner_id = %s AND idempotency_key = %s", (owner_id, idempotency_key))

    def latest_for_draft(self, owner_id: str, draft_id: str) -> PublicationRecord | None:
        return self._one("owner_id = %s AND draft_id = %s ORDER BY seq DESC LIMIT 1",
                         (owner_id, draft_id))

    def list_for_draft(self, owner_id: str, draft_id: str) -> list[PublicationRecord]:
        return self._many("owner_id = %s AND draft_id = %s ORDER BY seq DESC",
                          (owner_id, draft_id))

    def save(self, record: PublicationRecord) -> None:
        publication = record.publication
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO social_publications (id, owner_id, idempotency_key, draft_id, fingerprint, publication)
                VALUES (%s, %s, %s, %s, %s, %s)
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
        rows = self._many(where, params)
        return rows[0] if rows else None

    def _many(self, where: str, params: tuple[str, ...]) -> list[PublicationRecord]:
        with self._db.connect() as conn:
            rows = conn.execute(f"SELECT * FROM social_publications WHERE {where}", params).fetchall()
        return [
            PublicationRecord(
                owner_id=row["owner_id"],
                fingerprint=row["fingerprint"],
                publication=Publication.model_validate_json(row["publication"]),
            )
            for row in rows
        ]


class PgOAuthStateStore:
    """`state` de OAuth persistido para sobrevivir a cold-starts/cambio de instancia."""

    def __init__(self, db: PgDatabase) -> None:
        self._db = db

    def save(self, state: str, owner_id: str, platform: str,
             return_to: str, expires_at: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "INSERT INTO social_oauth_states (state, owner_id, platform, return_to, expires_at) VALUES (%s, %s, %s, %s, %s)",
                (state, owner_id, platform, return_to, expires_at),
            )

    def pop(self, state: str, platform: str) -> dict | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM social_oauth_states WHERE state = %s AND platform = %s",
                (state, platform),
            ).fetchone()
            if row is not None:
                conn.execute("DELETE FROM social_oauth_states WHERE state = %s", (state,))
            conn.execute(
                "DELETE FROM social_oauth_states WHERE expires_at < %s",
                (datetime.now().astimezone().isoformat(),),
            )
            return row

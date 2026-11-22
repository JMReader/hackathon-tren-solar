from __future__ import annotations

import sqlite3
from dataclasses import replace
from datetime import timedelta

import pytest
from conftest import NOW, OWNER
from social.crypto import TokenCipher
from social.models import Connection, Platform, Publication, PublicationRecord, PublicationStatus
from social.sqlite import SqliteConnectionStore, SqliteDatabase, SqlitePublicationStore

KEY = TokenCipher.generate_key()


def connection() -> Connection:
    return Connection(
        Platform.LINKEDIN,
        "secret-token-123",
        frozenset({"openid", "w_member_social"}),
        NOW + timedelta(days=60),
        "m-1",
        "Mayko",
    )


def record(publication_id: str, key: str, status=PublicationStatus.PUBLISHING) -> PublicationRecord:
    return PublicationRecord(
        OWNER,
        "d-1:1",
        Publication(
            id=publication_id,
            draft_id="d-1",
            draft_revision=1,
            platform=Platform.LINKEDIN,
            idempotency_key=key,
            status=status,
        ),
    )


def test_connections_survive_restart_and_token_is_encrypted_at_rest(tmp_path):
    path = tmp_path / "social.db"
    SqliteConnectionStore(SqliteDatabase(path), TokenCipher(KEY)).put(OWNER, connection())

    restored = SqliteConnectionStore(SqliteDatabase(path), TokenCipher(KEY)).get(OWNER, Platform.LINKEDIN)
    assert restored == connection()
    assert b"secret-token-123" not in path.read_bytes()


def test_connection_with_rotated_key_is_treated_as_disconnected(tmp_path):
    path = tmp_path / "social.db"
    SqliteConnectionStore(SqliteDatabase(path), TokenCipher(KEY)).put(OWNER, connection())
    other = SqliteConnectionStore(SqliteDatabase(path), TokenCipher(TokenCipher.generate_key()))
    assert other.get(OWNER, Platform.LINKEDIN) is None


def test_publications_survive_restart_with_idempotency_keys(tmp_path):
    path = tmp_path / "social.db"
    store = SqlitePublicationStore(SqliteDatabase(path))
    store.save(record("pub-1", "key-1"))
    store.save(record("pub-1", "key-1", PublicationStatus.SUCCEEDED))
    store.save(record("pub-2", "key-2"))

    restarted = SqlitePublicationStore(SqliteDatabase(path))
    assert restarted.get_by_key(OWNER, "key-1").publication.status is PublicationStatus.SUCCEEDED
    assert restarted.latest_for_draft(OWNER, "d-1").publication.id == "pub-2"
    assert restarted.get("intruder", "pub-1") is None


def test_database_rejects_reusing_an_idempotency_key_for_another_publication(tmp_path):
    store = SqlitePublicationStore(SqliteDatabase(tmp_path / "social.db"))
    store.save(record("pub-1", "key-1"))
    with pytest.raises(sqlite3.IntegrityError):
        store.save(record("pub-2", "key-1"))


def test_refresh_token_is_encrypted_and_old_databases_are_migrated(tmp_path):
    path = tmp_path / "social.db"
    with sqlite3.connect(path) as conn:
        conn.execute(
            "CREATE TABLE social_connections (owner_id TEXT NOT NULL, platform TEXT NOT NULL, "
            "encrypted_token BLOB NOT NULL, scopes TEXT NOT NULL, expires_at TEXT, account_id TEXT, "
            "account_handle TEXT, PRIMARY KEY (owner_id, platform))"
        )
    store = SqliteConnectionStore(SqliteDatabase(path), TokenCipher(KEY))
    store.put(OWNER, replace(connection(), platform=Platform.X, refresh_token="refresh-secret-456"))
    store.put(OWNER, connection())

    assert store.get(OWNER, Platform.X).refresh_token == "refresh-secret-456"
    assert store.get(OWNER, Platform.LINKEDIN).refresh_token is None
    assert b"refresh-secret-456" not in path.read_bytes()

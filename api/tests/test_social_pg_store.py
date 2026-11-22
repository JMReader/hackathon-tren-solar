from __future__ import annotations

from contextlib import contextmanager
from datetime import UTC, datetime

from social.crypto import TokenCipher
from social.models import Connection, Platform
from social.pg_store import PgConnectionStore

CIPHER = TokenCipher(TokenCipher.generate_key())


class FakeCursor:
    def __init__(self, row):
        self._row = row

    def fetchone(self):
        return self._row


class FakePg:
    def __init__(self, row=None):
        self.row = row
        self.calls: list[tuple[str, list]] = []

    @contextmanager
    def connect(self):
        yield self

    def execute(self, sql, params):
        self.calls.append((sql, list(params)))
        return FakeCursor(self.row)


def connection(refresh_token=None) -> Connection:
    return Connection(
        Platform.X, "access-1", frozenset({"tweet.write"}), datetime(2026, 11, 22, tzinfo=UTC), "u1", "@mayko",
        refresh_token=refresh_token,
    )


def test_put_without_refresh_token_does_not_need_the_new_column():
    db = FakePg()
    PgConnectionStore(db, CIPHER).put("ses_1", connection())
    [(sql, params)] = db.calls
    assert "encrypted_refresh_token" not in sql
    assert len(params) == 7


def test_put_with_refresh_token_stores_it_encrypted():
    db = FakePg()
    PgConnectionStore(db, CIPHER).put("ses_1", connection("refresh-1"))
    [(sql, params)] = db.calls
    assert "encrypted_refresh_token" in sql and "encrypted_refresh_token=EXCLUDED.encrypted_refresh_token" in sql
    assert CIPHER.decrypt(params[-1]) == "refresh-1"
    assert b"refresh-1" not in params[-1]


def test_get_restores_refresh_token_and_tolerates_missing_column():
    base = {
        "encrypted_token": CIPHER.encrypt("access-1"),
        "scopes": '["tweet.write"]',
        "expires_at": "2026-11-22T00:00:00+00:00",
        "account_id": "u1",
        "account_handle": "@mayko",
    }
    with_refresh = PgConnectionStore(FakePg({**base, "encrypted_refresh_token": CIPHER.encrypt("refresh-1")}), CIPHER)
    assert with_refresh.get("ses_1", Platform.X) == connection("refresh-1")
    assert PgConnectionStore(FakePg(base), CIPHER).get("ses_1", Platform.X) == connection()

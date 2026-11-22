from __future__ import annotations

from dataclasses import replace

from .crypto import TokenCipher
from .models import Connection, Platform, PublicationRecord


class InMemoryPublicationStore:
    def __init__(self) -> None:
        self._by_id: dict[str, PublicationRecord] = {}

    def get(self, owner_id: str, publication_id: str) -> PublicationRecord | None:
        record = self._by_id.get(publication_id)
        return record if record and record.owner_id == owner_id else None

    def get_by_key(self, owner_id: str, idempotency_key: str) -> PublicationRecord | None:
        return next(
            (
                r
                for r in self._by_id.values()
                if r.owner_id == owner_id and r.publication.idempotency_key == idempotency_key
            ),
            None,
        )

    def latest_for_draft(self, owner_id: str, draft_id: str) -> PublicationRecord | None:
        records = self.list_for_draft(owner_id, draft_id)
        return records[0] if records else None

    def list_for_draft(self, owner_id: str, draft_id: str) -> list[PublicationRecord]:
        return [
            r
            for r in reversed(list(self._by_id.values()))
            if r.owner_id == owner_id and r.publication.draft_id == draft_id
        ]

    def save(self, record: PublicationRecord) -> None:
        self._by_id[record.publication.id] = record


class InMemoryConnectionStore:
    def __init__(self, cipher: TokenCipher) -> None:
        self._cipher = cipher
        self._connections: dict[tuple[str, Platform], tuple[Connection, bytes, bytes | None]] = {}

    def get(self, owner_id: str, platform: Platform) -> Connection | None:
        stored = self._connections.get((owner_id, platform))
        if stored is None:
            return None
        connection, encrypted_token, encrypted_refresh = stored
        return replace(
            connection,
            access_token=self._cipher.decrypt(encrypted_token),
            refresh_token=self._cipher.decrypt(encrypted_refresh) if encrypted_refresh else None,
        )

    def put(self, owner_id: str, connection: Connection) -> None:
        self._connections[(owner_id, connection.platform)] = (
            replace(connection, access_token="", refresh_token=None),
            self._cipher.encrypt(connection.access_token),
            self._cipher.encrypt(connection.refresh_token) if connection.refresh_token else None,
        )

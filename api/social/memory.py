from __future__ import annotations

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
        records = [r for r in self._by_id.values() if r.owner_id == owner_id and r.publication.draft_id == draft_id]
        return records[-1] if records else None

    def save(self, record: PublicationRecord) -> None:
        self._by_id[record.publication.id] = record


class InMemoryConnectionStore:
    def __init__(self) -> None:
        self._connections: dict[tuple[str, Platform], Connection] = {}

    def get(self, owner_id: str, platform: Platform) -> Connection | None:
        return self._connections.get((owner_id, platform))

    def put(self, owner_id: str, connection: Connection) -> None:
        self._connections[(owner_id, connection.platform)] = connection

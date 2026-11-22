from __future__ import annotations

import threading
from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from uuid import uuid4

from . import assisted
from .models import (
    AccessState,
    AssistedShare,
    Availability,
    ErrorInfo,
    OutcomeKind,
    Platform,
    ProviderOutcome,
    Publication,
    PublicationRecord,
    PublicationStatus,
    PublishContent,
)
from .ports import ConnectionStore, DraftSource, PhotoSource, PublicationStore, SocialAdapter

MAX_IDEMPOTENCY_KEY_LENGTH = 255


class SocialError(Exception):
    http_status = 400

    def __init__(self, code: str, message: str, retryable: bool = False, **extra: object) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.extra = extra

    def detail(self) -> dict[str, object]:
        return {"code": self.code, "message": self.message, "retryable": self.retryable, **self.extra}


class InvalidRequest(SocialError):
    http_status = 400


class NotFound(SocialError):
    http_status = 404


class Conflict(SocialError):
    http_status = 409


class SocialService:
    def __init__(
        self,
        adapters: Mapping[Platform, SocialAdapter],
        connections: ConnectionStore,
        publications: PublicationStore,
        drafts: DraftSource,
        photos: PhotoSource,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        new_id: Callable[[], str] = lambda: uuid4().hex,
    ) -> None:
        missing = set(Platform) - set(adapters)
        if missing:
            raise ValueError(f"Faltan adaptadores para: {sorted(missing)}")
        self._adapters = adapters
        self._connections = connections
        self._publications = publications
        self._drafts = drafts
        self._photos = photos
        self._clock = clock
        self._new_id = new_id
        self._lock = threading.Lock()

    def availability(self, owner_id: str, platform: Platform) -> Availability:
        adapter = self._adapters[platform]
        if block := adapter.access_unavailable():
            return _availability(platform, AccessState.ACCESS_UNAVAILABLE, block.code, block.message)
        connection = self._connections.get(owner_id, platform)
        if connection is None:
            return _availability(
                platform,
                AccessState.CONNECTION_MISSING,
                "connection_missing",
                f"Conectá tu cuenta de {platform.label} para publicar directamente.",
            )
        if connection.expires_at is not None and connection.expires_at <= self._clock():
            return _availability(
                platform,
                AccessState.RECONNECT_REQUIRED,
                "connection_expired",
                f"Tu sesión de {platform.label} venció. Volvé a conectar la cuenta.",
            )
        if adapter.required_scopes - connection.scopes:
            return _availability(
                platform,
                AccessState.RECONNECT_REQUIRED,
                "missing_permission",
                f"Falta el permiso para publicar en {platform.label}. Volvé a conectar la cuenta.",
            )
        return _availability(platform, AccessState.AVAILABLE)

    def assisted_share(self, owner_id: str, draft_id: str) -> AssistedShare:
        draft = self._drafts.get(owner_id, draft_id)
        if draft is None:
            raise NotFound("draft_not_found", "No encontramos ese borrador.")
        support = assisted.support(draft.platform)
        return AssistedShare(
            draft_id=draft.id,
            draft_revision=draft.revision,
            platform=draft.platform,
            text=draft.body,
            photo_id=draft.photo_id,
            composer_url=assisted.composer_url(draft.platform, draft.body),
            official=support.official,
            attaches_photo=support.attaches_photo,
            notice=assisted.notice(draft.platform),
        )

    def publish(
        self,
        owner_id: str,
        draft_id: str,
        idempotency_key: str | None,
        draft_revision: int,
        confirmed: bool,
    ) -> tuple[Publication, bool]:
        key = self._validate_key(idempotency_key)
        if not confirmed:
            raise InvalidRequest("confirmation_required", "Confirmá el texto y la foto final antes de publicar.")
        fingerprint = f"{draft_id}:{draft_revision}"

        latest = self._publications.latest_for_draft(owner_id, draft_id)
        if latest and latest.publication.status is PublicationStatus.UNKNOWN:
            self._reconcile(latest)

        with self._lock:
            if existing := self._publications.get_by_key(owner_id, key):
                if existing.fingerprint != fingerprint:
                    raise Conflict("idempotency_key_reused", "Esa clave de idempotencia ya se usó para otro envío.")
                return existing.publication, True

            draft = self._drafts.get(owner_id, draft_id)
            if draft is None:
                raise NotFound("draft_not_found", "No encontramos ese borrador.")
            if draft.revision != draft_revision:
                raise Conflict("stale_revision", "El borrador cambió. Revisá la versión actual antes de publicar.")

            availability = self.availability(owner_id, draft.platform)
            if not availability.can_publish:
                raise Conflict(
                    "platform_unavailable",
                    availability.message or f"No se puede publicar en {draft.platform.label}.",
                    availability=availability.model_dump(mode="json"),
                )

            if latest := self._publications.latest_for_draft(owner_id, draft_id):
                self._ensure_can_retry(latest.publication)

            photo = self._photos.get(owner_id, draft.photo_id)
            if photo is None:
                raise Conflict("photo_unavailable", "No encontramos la foto del borrador.")

            connection = self._connections.get(owner_id, draft.platform)
            now = self._clock()
            record = PublicationRecord(
                owner_id=owner_id,
                idempotency_key=key,
                fingerprint=fingerprint,
                publication=Publication(
                    id=self._new_id(),
                    draft_id=draft_id,
                    draft_revision=draft_revision,
                    platform=draft.platform,
                    status=PublicationStatus.PUBLISHING,
                    created_at=now,
                    updated_at=now,
                ),
            )
            self._publications.save(record)

        adapter = self._adapters[draft.platform]
        try:
            outcome = adapter.publish(connection, PublishContent(body=draft.body, photo=photo))
        except Exception:
            outcome = ProviderOutcome.unknown(
                "provider_error",
                f"No pudimos confirmar el resultado en {draft.platform.label}. Verificá en la red antes de reintentar.",
            )
        return self._apply(record, outcome).publication, False

    def get(self, owner_id: str, publication_id: str) -> Publication:
        record = self._require(owner_id, publication_id)
        if record.publication.status is PublicationStatus.UNKNOWN:
            record = self._reconcile(record)
        return record.publication

    def resolve_not_published(self, owner_id: str, publication_id: str) -> Publication:
        with self._lock:
            record = self._require(owner_id, publication_id)
            if record.publication.status is not PublicationStatus.UNKNOWN:
                raise Conflict("not_unknown", "Sólo se puede resolver una publicación con resultado incierto.")
            error = ErrorInfo(
                code="confirmed_not_published",
                message="Confirmaste que no se publicó. Podés reintentar.",
                retryable=True,
            )
            return self._update(record, status=PublicationStatus.FAILED, error=error).publication

    def _validate_key(self, key: str | None) -> str:
        if not key:
            raise InvalidRequest("idempotency_key_required", "Falta el encabezado Idempotency-Key.")
        if len(key) > MAX_IDEMPOTENCY_KEY_LENGTH or not key.isascii() or not key.isprintable():
            raise InvalidRequest("invalid_idempotency_key", "La clave de idempotencia no es válida.")
        return key

    def _ensure_can_retry(self, publication: Publication) -> None:
        label = publication.platform.label
        match publication.status:
            case PublicationStatus.PUBLISHING:
                raise Conflict("publication_in_progress", f"Ya se está publicando en {label}.", retryable=True)
            case PublicationStatus.UNKNOWN:
                raise Conflict(
                    "reconciliation_required",
                    f"No sabemos si el post llegó a {label}. Verificá en la red antes de reintentar.",
                    publication_id=publication.id,
                )
            case PublicationStatus.SUCCEEDED:
                raise Conflict(
                    "already_published",
                    f"Este borrador ya se publicó en {label}.",
                    publication_id=publication.id,
                    url=publication.url,
                )
            case PublicationStatus.FAILED if publication.error and not publication.error.retryable:
                raise Conflict("not_retryable", publication.error.message, publication_id=publication.id)

    def _require(self, owner_id: str, publication_id: str) -> PublicationRecord:
        record = self._publications.get(owner_id, publication_id)
        if record is None:
            raise NotFound("publication_not_found", "No encontramos esa publicación.")
        return record

    def _reconcile(self, record: PublicationRecord) -> PublicationRecord:
        publication = record.publication
        connection = self._connections.get(record.owner_id, publication.platform)
        if connection is None:
            return record
        try:
            outcome = self._adapters[publication.platform].lookup(connection, publication)
        except Exception:
            outcome = None
        if outcome is None or outcome.kind is OutcomeKind.UNKNOWN:
            return record
        return self._apply(record, outcome)

    def _apply(self, record: PublicationRecord, outcome: ProviderOutcome) -> PublicationRecord:
        with self._lock:
            if outcome.kind is OutcomeKind.SUCCEEDED and (outcome.external_id or outcome.url):
                return self._update(
                    record,
                    status=PublicationStatus.SUCCEEDED,
                    external_id=outcome.external_id,
                    url=outcome.url,
                    error=None,
                )
            if outcome.kind is OutcomeKind.REJECTED:
                return self._update(record, status=PublicationStatus.FAILED, error=outcome.error)
            error = outcome.error or ErrorInfo(
                code="unconfirmed_result",
                message=f"{record.publication.platform.label} no devolvió un identificador del post. "
                "Verificá en la red antes de reintentar.",
                retryable=False,
            )
            return self._update(record, status=PublicationStatus.UNKNOWN, error=error)

    def _update(self, record: PublicationRecord, **changes: object) -> PublicationRecord:
        publication = record.publication.model_copy(update={**changes, "updated_at": self._clock()})
        updated = PublicationRecord(record.owner_id, record.idempotency_key, record.fingerprint, publication)
        self._publications.save(updated)
        return updated


def _availability(
    platform: Platform, state: AccessState, reason_code: str | None = None, message: str | None = None
) -> Availability:
    return Availability(
        platform=platform,
        state=state,
        can_publish=state is AccessState.AVAILABLE,
        can_connect=state in (AccessState.CONNECTION_MISSING, AccessState.RECONNECT_REQUIRED),
        assisted_share=assisted.support(platform),
        reason_code=reason_code,
        message=message,
    )

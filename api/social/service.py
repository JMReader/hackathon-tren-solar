from __future__ import annotations

import threading
from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from uuid import uuid4

from . import assisted
from .models import (
    AssistedShare,
    ConnectionState,
    ErrorDetail,
    OutcomeKind,
    Platform,
    ProviderOutcome,
    Publication,
    PublicationRecord,
    PublicationStatus,
    SocialConnectionStatus,
)
from .ports import ConnectionStore, DraftSource, PublicationStore, SocialAdapter

MIN_IDEMPOTENCY_KEY_LENGTH = 8
MAX_IDEMPOTENCY_KEY_LENGTH = 255


class SocialError(Exception):
    http_status = 400

    def __init__(self, code: str, message: str, retryable: bool = False, **extra: object) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.extra = extra

    def detail(self) -> ErrorDetail:
        return ErrorDetail(code=self.code, message=self.message, retryable=self.retryable)


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
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        new_id: Callable[[], str] = lambda: f"pub_{uuid4().hex}",
    ) -> None:
        missing = set(Platform) - set(adapters)
        if missing:
            raise ValueError(f"Faltan adaptadores para: {sorted(missing)}")
        self._adapters = adapters
        self._connections = connections
        self._publications = publications
        self._drafts = drafts
        self._clock = clock
        self._new_id = new_id
        self._lock = threading.Lock()

    def connection_status(self, owner_id: str, platform: Platform) -> SocialConnectionStatus:
        adapter = self._adapters[platform]
        if reason := adapter.access_unavailable():
            return _status(platform, ConnectionState.ACCESS_UNAVAILABLE, reason=reason)
        connection = self._connections.get(owner_id, platform)
        if connection is None:
            return _status(
                platform,
                ConnectionState.DISCONNECTED,
                reason=f"Conectá tu cuenta de {platform.label} para publicar directamente.",
            )
        if connection.expires_at is not None and connection.expires_at <= self._clock():
            return _status(
                platform,
                ConnectionState.EXPIRED,
                account_handle=connection.account_handle,
                reason=f"Tu sesión de {platform.label} venció. Volvé a conectar la cuenta.",
            )
        if adapter.required_scopes - connection.scopes:
            return _status(
                platform,
                ConnectionState.DISCONNECTED,
                account_handle=connection.account_handle,
                reason=f"Falta el permiso para publicar en {platform.label}. Volvé a conectar la cuenta.",
            )
        return _status(
            platform,
            ConnectionState.CONNECTED,
            can_publish_image=adapter.supports_image,
            can_read_posts=adapter.supports_read_posts,
            account_handle=connection.account_handle,
        )

    def assisted_share(self, owner_id: str, draft_id: str) -> AssistedShare:
        draft = self._drafts.get(owner_id, draft_id)
        if draft is None:
            raise NotFound("DRAFT_NOT_FOUND", "No encontramos ese borrador.")
        support = assisted.support(draft.platform)
        return AssistedShare(
            draft_id=draft.draft_id,
            draft_revision=draft.draft_revision,
            platform=draft.platform,
            text=draft.body,
            photo_id=draft.media.photo_id if draft.media else None,
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
        confirm_publish: bool,
    ) -> tuple[Publication, bool]:
        key = self._validate_key(idempotency_key)
        if not confirm_publish:
            raise InvalidRequest("CONFIRMATION_REQUIRED", "Confirmá el texto y la foto final antes de publicar.")
        fingerprint = f"{draft_id}:{draft_revision}"

        latest = self._publications.latest_for_draft(owner_id, draft_id)
        if latest and latest.publication.status is PublicationStatus.UNKNOWN:
            self._reconcile(latest)

        with self._lock:
            if existing := self._publications.get_by_key(owner_id, key):
                if existing.fingerprint != fingerprint:
                    raise Conflict("IDEMPOTENCY_KEY_REUSED", "Esa clave de idempotencia ya se usó para otro envío.")
                return existing.publication, True

            draft = self._drafts.get(owner_id, draft_id)
            if draft is None:
                raise NotFound("DRAFT_NOT_FOUND", "No encontramos ese borrador.")
            if draft.draft_revision != draft_revision:
                raise Conflict("REVISION_CONFLICT", "El borrador cambió. Revisá la versión actual antes de publicar.")

            status = self.connection_status(owner_id, draft.platform)
            if not status.can_publish_text:
                raise Conflict(
                    "ACCESS_UNAVAILABLE"
                    if status.status is ConnectionState.ACCESS_UNAVAILABLE
                    else "CONNECTION_REQUIRED",
                    status.reason or f"No se puede publicar en {draft.platform.label}.",
                    connection=status.model_dump(mode="json"),
                )
            if draft.media and not status.can_publish_image:
                raise Conflict(
                    "IMAGE_UNAVAILABLE",
                    f"{draft.platform.label} no permite publicar la foto desde la app. "
                    "Quitá la foto o publicala manualmente.",
                )

            if latest := self._publications.latest_for_draft(owner_id, draft_id):
                self._ensure_can_retry(latest.publication)

            connection = self._connections.get(owner_id, draft.platform)
            record = PublicationRecord(
                owner_id=owner_id,
                fingerprint=fingerprint,
                publication=Publication(
                    id=self._new_id(),
                    draft_id=draft_id,
                    draft_revision=draft_revision,
                    platform=draft.platform,
                    idempotency_key=key,
                    status=PublicationStatus.PUBLISHING,
                ),
            )
            self._publications.save(record)

        try:
            outcome = self._adapters[draft.platform].publish(connection, draft)
        except TimeoutError:
            outcome = ProviderOutcome.unknown(
                "PROVIDER_TIMEOUT_AFTER_SEND",
                f"{draft.platform.label} no confirmó a tiempo. "
                "Verificá en la red antes de reintentar para no duplicar.",
            )
        except Exception:
            outcome = ProviderOutcome.unknown(
                "PROVIDER_RESULT_UNKNOWN",
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
                raise Conflict("NOT_UNKNOWN", "Sólo se puede resolver una publicación con resultado incierto.")
            error = ErrorDetail(
                code="CONFIRMED_NOT_PUBLISHED",
                message="Confirmaste que no se publicó. Podés reintentar.",
                retryable=True,
            )
            return self._update(record, status=PublicationStatus.FAILED, error=error).publication

    def _validate_key(self, key: str | None) -> str:
        if not key:
            raise InvalidRequest("IDEMPOTENCY_KEY_REQUIRED", "Falta el encabezado Idempotency-Key.")
        if (
            not MIN_IDEMPOTENCY_KEY_LENGTH <= len(key) <= MAX_IDEMPOTENCY_KEY_LENGTH
            or not key.isascii()
            or not key.isprintable()
        ):
            raise InvalidRequest("INVALID_IDEMPOTENCY_KEY", "La clave de idempotencia no es válida.")
        return key

    def _ensure_can_retry(self, publication: Publication) -> None:
        label = publication.platform.label
        match publication.status:
            case PublicationStatus.PUBLISHING:
                raise Conflict(
                    "PUBLICATION_IN_PROGRESS",
                    f"Ya se está publicando en {label}.",
                    retryable=True,
                    publication_id=publication.id,
                )
            case PublicationStatus.UNKNOWN:
                raise Conflict(
                    "RECONCILIATION_REQUIRED",
                    f"No sabemos si el post llegó a {label}. Verificá en la red antes de reintentar.",
                    publication_id=publication.id,
                )
            case PublicationStatus.SUCCEEDED:
                raise Conflict(
                    "ALREADY_PUBLISHED",
                    f"Este borrador ya se publicó en {label}.",
                    publication_id=publication.id,
                    external_url=publication.external_url,
                )
            case PublicationStatus.FAILED if publication.error and not publication.error.retryable:
                raise Conflict("NOT_RETRYABLE", publication.error.message, publication_id=publication.id)

    def _require(self, owner_id: str, publication_id: str) -> PublicationRecord:
        record = self._publications.get(owner_id, publication_id)
        if record is None:
            raise NotFound("PUBLICATION_NOT_FOUND", "No encontramos esa publicación.")
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
            if outcome.kind is OutcomeKind.SUCCEEDED and (outcome.external_post_id or outcome.external_url):
                return self._update(
                    record,
                    status=PublicationStatus.SUCCEEDED,
                    external_post_id=outcome.external_post_id,
                    external_url=outcome.external_url,
                    published_at=self._clock(),
                    error=None,
                )
            if outcome.kind is OutcomeKind.REJECTED:
                return self._update(record, status=PublicationStatus.FAILED, error=outcome.error)
            error = outcome.error or ErrorDetail(
                code="PROVIDER_RESULT_UNCONFIRMED",
                message=f"{record.publication.platform.label} no devolvió un identificador del post. "
                "Verificá en la red antes de reintentar.",
                retryable=False,
            )
            return self._update(record, status=PublicationStatus.UNKNOWN, error=error)

    def _update(self, record: PublicationRecord, **changes: object) -> PublicationRecord:
        updated = PublicationRecord(record.owner_id, record.fingerprint, record.publication.model_copy(update=changes))
        self._publications.save(updated)
        return updated


def _status(
    platform: Platform,
    state: ConnectionState,
    *,
    can_publish_image: bool = False,
    can_read_posts: bool = False,
    account_handle: str | None = None,
    reason: str | None = None,
) -> SocialConnectionStatus:
    connected = state is ConnectionState.CONNECTED
    return SocialConnectionStatus(
        platform=platform,
        status=state,
        can_publish_text=connected,
        can_publish_image=connected and can_publish_image,
        can_read_posts=connected and can_read_posts,
        account_handle=account_handle,
        reason=reason,
        assisted_share=assisted.support(platform),
    )

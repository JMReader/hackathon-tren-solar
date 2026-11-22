from __future__ import annotations

import secrets
import threading
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from .models import Connection, ConnectionState, Platform, SocialConnectionStatus, StartSocialConnectionResponse
from .ports import ConnectionStore, OAuthError, OAuthProvider, TokenRefresher
from .service import InvalidRequest, SocialError, SocialService

STATE_TTL = timedelta(minutes=10)
REFRESH_MARGIN = timedelta(minutes=2)
DEFAULT_RETURN_TO = "/crear"


class ProviderUnavailable(Exception):
    def __init__(self, status: SocialConnectionStatus) -> None:
        super().__init__(status.reason)
        self.status = status


class Unsupported(SocialError):
    http_status = 501


class RefreshingConnectionStore:
    def __init__(
        self,
        store: ConnectionStore,
        refreshers: Mapping[Platform, TokenRefresher],
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._store = store
        self._refreshers = refreshers
        self._clock = clock
        self._lock = threading.Lock()

    def get(self, owner_id: str, platform: Platform) -> Connection | None:
        connection = self._store.get(owner_id, platform)
        refresher = self._refreshers.get(platform)
        if refresher is None or not self._stale(connection):
            return connection
        with self._lock:
            connection = self._store.get(owner_id, platform)
            if not self._stale(connection):
                return connection
            try:
                refreshed = refresher.refresh(connection)
            except OAuthError:
                return connection
            self._store.put(owner_id, refreshed)
            return refreshed

    def put(self, owner_id: str, connection: Connection) -> None:
        self._store.put(owner_id, connection)

    def _stale(self, connection: Connection | None) -> bool:
        return (
            connection is not None
            and connection.refresh_token is not None
            and connection.expires_at is not None
            and connection.expires_at - REFRESH_MARGIN <= self._clock()
        )


@dataclass(frozen=True)
class PendingAuthorization:
    owner_id: str
    platform: Platform
    return_to: str
    expires_at: datetime


class ConnectionFlow:
    def __init__(
        self,
        service: SocialService,
        providers: Mapping[Platform, OAuthProvider],
        connections: ConnectionStore,
        web_base_url: str,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        new_state: Callable[[], str] = lambda: secrets.token_urlsafe(32),
    ) -> None:
        self._service = service
        self._providers = providers
        self._connections = connections
        self._web_base_url = web_base_url.rstrip("/")
        self._clock = clock
        self._new_state = new_state
        self._pending: dict[str, PendingAuthorization] = {}
        self._lock = threading.Lock()

    def start(self, owner_id: str, platform: Platform, return_to: str | None) -> StartSocialConnectionResponse:
        status = self._service.connection_status(owner_id, platform)
        if status.status is ConnectionState.ACCESS_UNAVAILABLE:
            raise ProviderUnavailable(status)
        provider = self._providers.get(platform)
        if provider is None:
            raise Unsupported(
                "OAUTH_NOT_IMPLEMENTED", f"La conexión con {platform.label} todavía no está implementada."
            )
        target = _safe_return_to(return_to)
        state = self._new_state()
        now = self._clock()
        with self._lock:
            self._pending = {k: v for k, v in self._pending.items() if v.expires_at > now}
            self._pending[state] = PendingAuthorization(owner_id, platform, target, now + STATE_TTL)
        return StartSocialConnectionResponse(
            platform=platform, authorization_url=provider.authorization_url(state), state=state
        )

    def complete(self, platform: Platform, state: str, code: str | None, error: str | None) -> str:
        with self._lock:
            pending = self._pending.pop(state, None)
        if pending is None or pending.platform is not platform or pending.expires_at <= self._clock():
            raise InvalidRequest(
                "OAUTH_STATE_INVALID", "El enlace de conexión venció o no es válido. Volvé a intentar."
            )
        if error or not code:
            return self._redirect(pending, "error", error or "missing_code")
        try:
            connection = self._providers[platform].complete(code, state)
        except OAuthError as failure:
            return self._redirect(pending, "error", failure.code)
        self._connections.put(pending.owner_id, connection)
        return self._redirect(pending, "connected")

    def _redirect(self, pending: PendingAuthorization, result: str, reason: str | None = None) -> str:
        query = {"social": pending.platform.value, "result": result} | ({"reason": reason} if reason else {})
        separator = "&" if "?" in pending.return_to else "?"
        return f"{self._web_base_url}{pending.return_to}{separator}{urlencode(query)}"


def _safe_return_to(return_to: str | None) -> str:
    if not return_to:
        return DEFAULT_RETURN_TO
    if not return_to.startswith("/") or return_to.startswith("//") or "\\" in return_to:
        raise InvalidRequest("INVALID_RETURN_TO", "return_to debe ser una ruta relativa del frontend.")
    return return_to

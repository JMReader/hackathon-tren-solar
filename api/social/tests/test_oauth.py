from __future__ import annotations

from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import pytest
from conftest import NOW, OWNER
from social.crypto import TokenCipher
from social.memory import InMemoryConnectionStore
from social.models import Connection, ConnectionState, Platform
from social.oauth import STATE_TTL, ConnectionFlow, ProviderUnavailable, Unsupported
from social.ports import OAuthError
from social.service import InvalidRequest


class FakeProvider:
    platform = Platform.LINKEDIN

    def __init__(self):
        self.failure: OAuthError | None = None
        self.codes: list[str] = []

    def authorization_url(self, state: str) -> str:
        return f"https://provider.test/auth?state={state}"

    def complete(self, code: str) -> Connection:
        self.codes.append(code)
        if self.failure:
            raise self.failure
        return Connection(
            Platform.LINKEDIN, "access-token-1", frozenset({"write"}), NOW + timedelta(days=60), "member-1", "Mayko"
        )


@pytest.fixture
def flow(env):
    provider = FakeProvider()
    states = iter(f"state-{n}" for n in range(1, 100))
    flow = ConnectionFlow(
        env.service,
        {Platform.LINKEDIN: provider},
        env.connections,
        "http://web.test/",
        clock=lambda: env.clock[0],
        new_state=lambda: next(states),
    )
    flow.provider = provider
    return flow


def query(url: str) -> dict:
    return {k: v[0] for k, v in parse_qs(urlsplit(url).query).items()}


def test_start_returns_provider_url_with_one_time_state(flow):
    response = flow.start(OWNER, Platform.LINKEDIN, "/crear/abc/publicar")
    assert (response.state, response.authorization_url) == ("state-1", "https://provider.test/auth?state=state-1")


def test_callback_stores_connection_and_redirects_to_front(flow, env):
    flow.start(OWNER, Platform.LINKEDIN, "/crear/abc/publicar")
    url = flow.complete(Platform.LINKEDIN, "state-1", "code-1", None)
    assert url.startswith("http://web.test/crear/abc/publicar?")
    assert query(url) == {"social": "linkedin", "result": "connected"}
    status = env.service.connection_status(OWNER, Platform.LINKEDIN)
    assert (status.status, status.account_handle) == (ConnectionState.CONNECTED, "Mayko")


def test_state_cannot_be_reused(flow):
    flow.start(OWNER, Platform.LINKEDIN, None)
    flow.complete(Platform.LINKEDIN, "state-1", "code-1", None)
    with pytest.raises(InvalidRequest) as error:
        flow.complete(Platform.LINKEDIN, "state-1", "code-1", None)
    assert error.value.code == "OAUTH_STATE_INVALID"


@pytest.mark.parametrize("case", ["unknown", "expired", "other_platform"])
def test_invalid_state_is_rejected_without_calling_provider(flow, env, case):
    flow.start(OWNER, Platform.LINKEDIN, None)
    state, platform = "state-1", Platform.LINKEDIN
    if case == "unknown":
        state = "forged"
    elif case == "expired":
        env.clock[0] = NOW + STATE_TTL + timedelta(seconds=1)
    else:
        platform = Platform.X
    with pytest.raises(InvalidRequest):
        flow.complete(platform, state, "code-1", None)
    assert flow.provider.codes == []


def test_provider_denial_redirects_with_reason(flow, env):
    flow.start(OWNER, Platform.LINKEDIN, None)
    url = flow.complete(Platform.LINKEDIN, "state-1", None, "user_cancelled_authorize")
    assert query(url) == {"social": "linkedin", "result": "error", "reason": "user_cancelled_authorize"}
    assert urlsplit(url).path == "/crear"
    assert env.service.connection_status(OWNER, Platform.LINKEDIN).status is ConnectionState.DISCONNECTED


def test_token_exchange_failure_redirects_with_reason(flow):
    flow.provider.failure = OAuthError("invalid_request")
    flow.start(OWNER, Platform.LINKEDIN, None)
    assert query(flow.complete(Platform.LINKEDIN, "state-1", "code-1", None))["reason"] == "invalid_request"


@pytest.mark.parametrize("return_to", ["https://evil.test", "//evil.test", "evil", "/\\evil.test"])
def test_return_to_must_be_relative(flow, return_to):
    with pytest.raises(InvalidRequest) as error:
        flow.start(OWNER, Platform.LINKEDIN, return_to)
    assert error.value.code == "INVALID_RETURN_TO"


def test_blocked_provider_raises_unavailable(flow, env):
    env.adapters[Platform.LINKEDIN].reason = "Sin app"
    with pytest.raises(ProviderUnavailable) as error:
        flow.start(OWNER, Platform.LINKEDIN, None)
    assert error.value.status.status is ConnectionState.ACCESS_UNAVAILABLE


def test_platform_without_oauth_is_unsupported(flow):
    with pytest.raises(Unsupported) as error:
        flow.start(OWNER, Platform.X, None)
    assert error.value.code == "OAUTH_NOT_IMPLEMENTED"


def test_tokens_are_stored_encrypted():
    cipher = TokenCipher(TokenCipher.generate_key())
    store = InMemoryConnectionStore(cipher)
    store.put(OWNER, Connection(Platform.LINKEDIN, "very-secret-token"))
    [(stored, encrypted)] = store._connections.values()
    assert stored.access_token == "" and b"very-secret-token" not in encrypted
    assert store.get(OWNER, Platform.LINKEDIN).access_token == "very-secret-token"


def test_tokens_cannot_be_read_with_another_key():
    encrypted = TokenCipher(TokenCipher.generate_key()).encrypt("token")
    with pytest.raises(ValueError):
        TokenCipher(TokenCipher.generate_key()).decrypt(encrypted)

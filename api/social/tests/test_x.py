from __future__ import annotations

import base64
import hashlib
import json
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from conftest import NOW, OWNER
from social.crypto import TokenCipher
from social.memory import InMemoryConnectionStore
from social.models import Connection, OutcomeKind, Platform, PublishableDraft, PublishableMedia
from social.oauth import RefreshingConnectionStore
from social.ports import OAuthError
from social.x import XAdapter, XConfig, weighted_length

CONFIG = XConfig("client-123", "secret-xyz", "http://localhost:8000/api/v1/social/x/callback")
SCOPES = frozenset({"tweet.read", "tweet.write", "users.read", "media.write", "offline.access"})
CONNECTION = Connection(
    Platform.X, "token-abc", SCOPES, NOW + timedelta(hours=2), "user-1", "@mayko", refresh_token="refresh-1"
)


class Recorder:
    def __init__(self, handler):
        self.requests: list[httpx2.Request] = []
        self._handler = handler

    def __call__(self, request: httpx2.Request) -> httpx2.Response:
        self.requests.append(request)
        return self._handler(request)


def adapter(handler, config: XConfig = CONFIG) -> tuple[XAdapter, Recorder]:
    recorder = Recorder(handler)
    return XAdapter(config, httpx2.Client(transport=httpx2.MockTransport(recorder)), clock=lambda: NOW), recorder


def draft(body: str = "Hola #TrenSolar", media: PublishableMedia | None = None) -> PublishableDraft:
    return PublishableDraft("drf_1", 1, Platform.X, body, media)


def created(post_id: str = "1900000000000000001") -> httpx2.Response:
    return httpx2.Response(201, json={"data": {"id": post_id, "text": "Hola #TrenSolar"}})


def basic(client_id: str, secret: str) -> str:
    return "Basic " + base64.b64encode(f"{client_id}:{secret}".encode()).decode()


def test_authorization_url_uses_pkce_s256_and_publishing_scopes():
    x, _ = adapter(lambda r: httpx2.Response(500))
    url = urlsplit(x.authorization_url("state-1"))
    query = parse_qs(url.query)
    assert f"{url.scheme}://{url.netloc}{url.path}" == "https://x.com/i/oauth2/authorize"
    assert {k: v for k, v in query.items() if k != "code_challenge"} == {
        "response_type": ["code"],
        "client_id": ["client-123"],
        "redirect_uri": [CONFIG.redirect_uri],
        "scope": ["tweet.read tweet.write users.read media.write offline.access"],
        "state": ["state-1"],
        "code_challenge_method": ["S256"],
    }
    other = parse_qs(urlsplit(x.authorization_url("state-2")).query)["code_challenge"]
    assert query["code_challenge"] != other


def test_complete_exchanges_code_with_matching_verifier_and_reads_user():
    x, _ = adapter(lambda r: httpx2.Response(500))
    challenge = parse_qs(urlsplit(x.authorization_url("state-1")).query)["code_challenge"][0]

    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/2/oauth2/token":
            form = parse_qs(request.content.decode())
            verifier = form.pop("code_verifier")[0]
            digest = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
            assert digest == challenge and 43 <= len(verifier) <= 128
            assert form == {
                "grant_type": ["authorization_code"],
                "code": ["code-1"],
                "redirect_uri": [CONFIG.redirect_uri],
                "client_id": ["client-123"],
            }
            assert request.headers["Authorization"] == basic("client-123", "secret-xyz")
            return httpx2.Response(
                200,
                json={
                    "token_type": "bearer",
                    "access_token": "tok",
                    "refresh_token": "ref",
                    "expires_in": 7200,
                    "scope": " ".join(sorted(SCOPES)),
                },
            )
        assert request.url.path == "/2/users/me"
        assert request.headers["Authorization"] == "Bearer tok"
        return httpx2.Response(200, json={"data": {"id": "user-9", "name": "Mayko", "username": "mayko2003"}})

    x, recorder = adapter(handler)
    connection = x.complete("code-1", "state-1")
    assert [r.url.path for r in recorder.requests] == ["/2/oauth2/token", "/2/users/me"]
    assert (connection.access_token, connection.refresh_token, connection.account_id, connection.account_handle) == (
        "tok",
        "ref",
        "user-9",
        "@mayko2003",
    )
    assert connection.scopes == SCOPES
    assert connection.expires_at == NOW + timedelta(hours=2)
    assert "tok" not in repr(connection) and "ref" not in repr(connection)


@pytest.mark.parametrize(
    ("handler", "code"),
    [
        (lambda r: httpx2.Response(400, json={"error": "invalid_request"}), "invalid_request"),
        (
            lambda r: (
                httpx2.Response(200, json={"access_token": "tok", "expires_in": 7200})
                if r.url.path == "/2/oauth2/token"
                else httpx2.Response(401)
            ),
            "userinfo_http_401",
        ),
    ],
)
def test_complete_failures_raise_oauth_error(handler, code):
    x, _ = adapter(handler)
    with pytest.raises(OAuthError) as error:
        x.complete("code-1", "state-1")
    assert error.value.code == code


def test_refresh_rotates_tokens():
    def handler(request: httpx2.Request) -> httpx2.Response:
        assert parse_qs(request.content.decode()) == {
            "grant_type": ["refresh_token"],
            "refresh_token": ["refresh-1"],
            "client_id": ["client-123"],
        }
        return httpx2.Response(200, json={"access_token": "tok-2", "refresh_token": "refresh-2", "expires_in": 7200})

    x, _ = adapter(handler)
    refreshed = x.refresh(CONNECTION)
    assert (refreshed.access_token, refreshed.refresh_token, refreshed.scopes) == ("tok-2", "refresh-2", SCOPES)
    assert refreshed.expires_at == NOW + timedelta(hours=2)


def test_refresh_failure_raises_oauth_error():
    x, _ = adapter(lambda r: httpx2.Response(400, json={"error": "invalid_grant"}))
    with pytest.raises(OAuthError) as error:
        x.refresh(CONNECTION)
    assert error.value.code == "invalid_grant"


def test_publish_text_post():
    x, recorder = adapter(lambda r: created())
    outcome = x.publish(CONNECTION, draft())
    assert outcome.kind is OutcomeKind.SUCCEEDED
    assert outcome.external_post_id == "1900000000000000001"
    assert outcome.external_url == "https://x.com/mayko/status/1900000000000000001"
    [request] = recorder.requests
    assert (request.url.path, request.headers["Authorization"]) == ("/2/tweets", "Bearer token-abc")
    assert json.loads(request.content) == {"text": "Hola #TrenSolar"}


def test_publish_with_photo_uploads_media_and_alt_text(tmp_path):
    photo = tmp_path / "foto.jpg"
    photo.write_bytes(b"\xff\xd8jpeg-bytes")
    media = PublishableMedia("med_1", "image/jpeg", str(photo), "Panel solar")

    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/2/media/upload":
            body = request.content
            assert b'name="media_category"' in body and b"tweet_image" in body and b"jpeg-bytes" in body
            return httpx2.Response(200, json={"data": {"id": "777", "media_key": "3_777"}})
        if request.url.path == "/2/media/metadata":
            assert json.loads(request.content) == {"id": "777", "metadata": {"alt_text": {"text": "Panel solar"}}}
            return httpx2.Response(200, json={"data": {"id": "777"}})
        assert json.loads(request.content) == {"text": "Hola #TrenSolar", "media": {"media_ids": ["777"]}}
        return created()

    x, recorder = adapter(handler)
    assert x.publish(CONNECTION, draft(media=media)).kind is OutcomeKind.SUCCEEDED
    assert [r.url.path for r in recorder.requests] == ["/2/media/upload", "/2/media/metadata", "/2/tweets"]


@pytest.mark.parametrize("body", ["Mirá https://example.com", "Entrá a www.ejemplo.org", "Visitá chambear.com.ar"])
def test_links_are_rejected_before_calling_x(body):
    x, recorder = adapter(lambda r: created())
    outcome = x.publish(CONNECTION, draft(body))
    assert (outcome.kind, outcome.error.code, outcome.error.retryable) == (
        OutcomeKind.REJECTED,
        "LINKS_NOT_ALLOWED",
        True,
    )
    assert recorder.requests == []


def test_links_can_be_allowed():
    x, _ = adapter(lambda r: created(), XConfig("c", "s", "r", allow_links=True))
    assert x.publish(CONNECTION, draft("Mirá https://example.com")).kind is OutcomeKind.SUCCEEDED


def test_text_over_280_weighted_chars_is_rejected_before_calling_x():
    assert weighted_length("a" * 280) == 280
    assert weighted_length("日本") == 4
    x, recorder = adapter(lambda r: created())
    assert x.publish(CONNECTION, draft("a" * 280)).kind is OutcomeKind.SUCCEEDED
    outcome = x.publish(CONNECTION, draft("日" * 141))
    assert (outcome.error.code, outcome.error.retryable) == ("TEXT_TOO_LONG", True)
    assert len(recorder.requests) == 1


@pytest.mark.parametrize(
    ("response", "kind", "code", "retryable"),
    [
        (httpx2.Response(401), OutcomeKind.REJECTED, "OAUTH_TOKEN_EXPIRED", True),
        (
            httpx2.Response(402, json={"title": "CreditsDepleted", "detail": "no credits"}),
            OutcomeKind.REJECTED,
            "PROVIDER_CREDITS_EXHAUSTED",
            True,
        ),
        (
            httpx2.Response(403, json={"detail": "Your account has reached its billing cycle spend cap."}),
            OutcomeKind.REJECTED,
            "PROVIDER_CREDITS_EXHAUSTED",
            True,
        ),
        (
            httpx2.Response(403, json={"detail": "You are not allowed to create a Tweet with duplicate content."}),
            OutcomeKind.REJECTED,
            "DUPLICATE_CONTENT",
            False,
        ),
        (httpx2.Response(403, json={"title": "Forbidden"}), OutcomeKind.REJECTED, "PERMISSION_DENIED", False),
        (httpx2.Response(429), OutcomeKind.REJECTED, "RATE_LIMITED", True),
        (
            httpx2.Response(400, json={"errors": [{"message": "bad"}]}),
            OutcomeKind.REJECTED,
            "CONTENT_REJECTED",
            False,
        ),
        (httpx2.Response(503), OutcomeKind.UNKNOWN, "PROVIDER_ERROR_AFTER_SEND", False),
    ],
)
def test_error_mapping(response, kind, code, retryable):
    x, _ = adapter(lambda r: response)
    outcome = x.publish(CONNECTION, draft())
    assert (outcome.kind, outcome.error.code, outcome.error.retryable) == (kind, code, retryable)


def test_timeout_after_send_is_unknown_and_connect_error_is_retryable():
    def timeout(request):
        raise httpx2.ReadTimeout("slow", request=request)

    def unreachable(request):
        raise httpx2.ConnectError("down", request=request)

    assert adapter(timeout)[0].publish(CONNECTION, draft()).error.code == "PROVIDER_TIMEOUT_AFTER_SEND"
    outcome = adapter(unreachable)[0].publish(CONNECTION, draft())
    assert (outcome.kind, outcome.error.code, outcome.error.retryable) == (
        OutcomeKind.REJECTED,
        "PROVIDER_UNREACHABLE",
        True,
    )


def test_upload_failures_never_post(tmp_path):
    photo = tmp_path / "foto.png"
    photo.write_bytes(b"png")
    media = PublishableMedia("med_1", "image/png", str(photo))

    x, recorder = adapter(lambda r: httpx2.Response(402, json={"title": "CreditsDepleted"}))
    assert x.publish(CONNECTION, draft(media=media)).error.code == "PROVIDER_CREDITS_EXHAUSTED"
    x, _ = adapter(lambda r: httpx2.Response(500))
    assert x.publish(CONNECTION, draft(media=media)).error.code == "IMAGE_UPLOAD_FAILED"
    missing = PublishableMedia("med_2", "image/png", str(tmp_path / "missing.png"))
    assert x.publish(CONNECTION, draft(media=missing)).error.code == "IMAGE_UPLOAD_FAILED"
    photo.write_bytes(b"0" * (5 * 1024 * 1024 + 1))
    assert x.publish(CONNECTION, draft(media=media)).error.code == "IMAGE_TOO_LARGE"
    assert all(r.url.path != "/2/tweets" for r in recorder.requests)


class FakeRefresher:
    def __init__(self, failure: OAuthError | None = None) -> None:
        self.calls = 0
        self.failure = failure

    def refresh(self, connection: Connection) -> Connection:
        self.calls += 1
        if self.failure:
            raise self.failure
        return Connection(
            Platform.X, "tok-2", connection.scopes, NOW + timedelta(hours=2), "user-1", "@mayko", refresh_token="r-2"
        )


def refreshing(refresher: FakeRefresher, expires_at) -> tuple[RefreshingConnectionStore, InMemoryConnectionStore]:
    inner = InMemoryConnectionStore(TokenCipher(TokenCipher.generate_key()))
    inner.put(OWNER, Connection(Platform.X, "tok-1", SCOPES, expires_at, "user-1", "@mayko", refresh_token="r-1"))
    return RefreshingConnectionStore(inner, {Platform.X: refresher}, clock=lambda: NOW), inner


def test_store_refreshes_and_persists_expiring_connection():
    refresher = FakeRefresher()
    store, inner = refreshing(refresher, NOW + timedelta(minutes=1))
    assert store.get(OWNER, Platform.X).access_token == "tok-2"
    assert (inner.get(OWNER, Platform.X).access_token, inner.get(OWNER, Platform.X).refresh_token) == ("tok-2", "r-2")
    store.get(OWNER, Platform.X)
    assert refresher.calls == 1


def test_store_keeps_fresh_connection_and_survives_refresh_failure():
    refresher = FakeRefresher()
    store, _ = refreshing(refresher, NOW + timedelta(hours=1))
    assert store.get(OWNER, Platform.X).access_token == "tok-1" and refresher.calls == 0

    store, _ = refreshing(FakeRefresher(OAuthError("invalid_grant")), NOW - timedelta(minutes=1))
    assert store.get(OWNER, Platform.X).access_token == "tok-1"

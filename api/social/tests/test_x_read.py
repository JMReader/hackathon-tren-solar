from __future__ import annotations

from datetime import timedelta

import httpx2
import pytest
from conftest import NOW

from social.models import Connection, Platform
from social.ports import ProviderReadError
from social.x import XAdapter, XConfig

CONFIG = XConfig("client-123", "secret-xyz", "http://localhost:8000/api/v1/social/x/callback")
CONNECTION = Connection(
    Platform.X,
    "token-abc",
    frozenset({"tweet.read", "tweet.write", "users.read", "media.write"}),
    NOW + timedelta(hours=2),
    "user-1",
    "@mayko",
)


def reader(handler) -> tuple[XAdapter, list[httpx2.Request]]:
    requests: list[httpx2.Request] = []

    def record(request: httpx2.Request) -> httpx2.Response:
        requests.append(request)
        return handler(request)

    return XAdapter(CONFIG, httpx2.Client(transport=httpx2.MockTransport(record)), clock=lambda: NOW), requests


def timeline(*items: dict) -> httpx2.Response:
    return httpx2.Response(200, json={"data": list(items), "meta": {"result_count": len(items)}})


def test_reads_own_posts_without_replies_or_reposts():
    x, requests = reader(lambda r: timeline({"id": "1", "text": "hola mundo"}))
    assert x.supports_read_posts is True
    assert x.read_recent_posts(CONNECTION, 5) == ["hola mundo"]
    [request] = requests
    assert request.url.path == "/2/users/user-1/tweets"
    assert dict(request.url.params) == {"max_results": "10", "exclude": "replies,retweets", "tweet.fields": "note_tweet"}
    assert request.headers["Authorization"] == "Bearer token-abc"


def test_prefers_full_long_post_text_and_drops_media_links():
    x, _ = reader(
        lambda r: timeline(
            {"id": "1", "text": "corto… https://t.co/abc", "note_tweet": {"text": "texto largo completo"}},
            {"id": "2", "text": "con foto https://t.co/Xyz123"},
            {"id": "3", "text": "https://t.co/onlymedia"},
        )
    )
    assert x.read_recent_posts(CONNECTION, 5) == ["texto largo completo", "con foto"]


def test_limits_results_and_request_size():
    x, requests = reader(lambda r: timeline(*({"id": str(i), "text": f"post {i}"} for i in range(30))))
    assert x.read_recent_posts(CONNECTION, 50) == [f"post {i}" for i in range(20)]
    assert requests[0].url.params["max_results"] == "40"


def test_empty_timeline_returns_no_posts():
    x, _ = reader(lambda r: httpx2.Response(200, json={"meta": {"result_count": 0}}))
    assert x.read_recent_posts(CONNECTION, 5) == []


def fail(error):
    def handler(request):
        raise error

    return handler


@pytest.mark.parametrize(
    ("handler", "code", "retryable"),
    [
        (lambda r: httpx2.Response(401), "OAUTH_TOKEN_EXPIRED", True),
        (lambda r: httpx2.Response(402, json={"title": "Payment Required"}), "READ_UNAVAILABLE", False),
        (lambda r: httpx2.Response(403, json={"detail": "client-not-enrolled"}), "READ_UNAVAILABLE", False),
        (lambda r: httpx2.Response(429), "RATE_LIMITED", True),
        (lambda r: httpx2.Response(503), "PROVIDER_ERROR", True),
        (fail(httpx2.ConnectError("down")), "PROVIDER_UNREACHABLE", True),
    ],
)
def test_read_errors_are_explicit(handler, code, retryable):
    x, _ = reader(handler)
    with pytest.raises(ProviderReadError) as error:
        x.read_recent_posts(CONNECTION, 5)
    assert (error.value.code, error.value.retryable) == (code, retryable)

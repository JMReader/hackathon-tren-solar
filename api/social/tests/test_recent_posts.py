from __future__ import annotations

from datetime import timedelta

import pytest
from conftest import NOW, OWNER

from social.models import Platform, ReadStatus
from social.ports import ProviderReadError


@pytest.fixture
def x_reader(env):
    adapter = env.adapters[Platform.X]
    adapter.supports_read_posts = True
    adapter.posts = ["post 1", "post 2"]
    adapter.reads = []

    def read_recent_posts(connection, limit, profile_url=None):
        adapter.reads.append((connection.account_id, limit))
        if isinstance(adapter.posts, Exception):
            raise adapter.posts
        return adapter.posts

    adapter.read_recent_posts = read_recent_posts
    return adapter


def test_connected_reader_returns_posts(env, x_reader):
    env.connect(Platform.X, account_id="user-1")
    result = env.service.recent_posts(OWNER, Platform.X, 5)
    assert (result.status, result.posts) == (ReadStatus.SUCCEEDED, ("post 1", "post 2"))
    assert x_reader.reads == [("user-1", 5)]


def test_not_connected_is_skipped_without_calling_provider(env, x_reader):
    result = env.service.recent_posts(OWNER, Platform.X, 5)
    assert result.status is ReadStatus.SKIPPED
    assert x_reader.reads == []


def test_expired_connection_is_skipped(env, x_reader):
    env.connect(Platform.X, expires_at=NOW - timedelta(seconds=1))
    assert env.service.recent_posts(OWNER, Platform.X, 5).status is ReadStatus.SKIPPED


def test_network_that_cannot_read_is_unavailable(env):
    env.connect(Platform.LINKEDIN)
    result = env.service.recent_posts(OWNER, Platform.LINKEDIN, 5)
    assert result.status is ReadStatus.UNAVAILABLE and "muestra de escritura" in result.message


@pytest.mark.parametrize(
    ("failure", "status"),
    [
        (ProviderReadError("READ_UNAVAILABLE", "Sin créditos", False), ReadStatus.UNAVAILABLE),
        (ProviderReadError("RATE_LIMITED", "Esperá", True), ReadStatus.FAILED),
        (RuntimeError("boom"), ReadStatus.FAILED),
    ],
)
def test_provider_failures_never_break_onboarding(env, x_reader, failure, status):
    env.connect(Platform.X)
    x_reader.posts = failure
    result = env.service.recent_posts(OWNER, Platform.X, 5)
    assert (result.status, result.posts) == (status, ())


def test_empty_timeline_is_unavailable(env, x_reader):
    env.connect(Platform.X)
    x_reader.posts = []
    assert env.service.recent_posts(OWNER, Platform.X, 5).status is ReadStatus.UNAVAILABLE

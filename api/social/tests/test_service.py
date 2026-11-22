from __future__ import annotations

import threading
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import pytest
from conftest import NOW, OWNER
from social.adapters import default_adapters
from social.memory import InMemoryConnectionStore, InMemoryPublicationStore
from social.models import AccessState, ErrorInfo, Platform, ProviderOutcome, PublicationStatus
from social.service import Conflict, InvalidRequest, NotFound, SocialService


def publish(env, draft_id="d-li", key="k1", revision=1, confirmed=True, owner=OWNER):
    return env.service.publish(owner, draft_id, key, revision, confirmed)


@pytest.fixture
def ready(env):
    env.connect(Platform.LINKEDIN)
    env.add_draft("d-li", Platform.LINKEDIN)
    return env


class TestAvailability:
    def test_provider_block_wins_over_connection(self, env):
        env.connect(Platform.X)
        env.adapters[Platform.X].block = ErrorInfo(
            code="provider_access_pending", message="Sin créditos", retryable=False
        )
        row = env.service.availability(OWNER, Platform.X)
        assert (row.state, row.can_publish, row.can_connect, row.reason_code) == (
            AccessState.ACCESS_UNAVAILABLE,
            False,
            False,
            "provider_access_pending",
        )

    def test_missing_connection_offers_connect(self, env):
        row = env.service.availability(OWNER, Platform.LINKEDIN)
        assert (row.state, row.can_publish, row.can_connect) == (AccessState.CONNECTION_MISSING, False, True)

    def test_expired_connection_requires_reconnect(self, env):
        env.connect(Platform.LINKEDIN, expires_at=NOW - timedelta(seconds=1))
        row = env.service.availability(OWNER, Platform.LINKEDIN)
        assert (row.state, row.reason_code, row.can_connect) == (
            AccessState.RECONNECT_REQUIRED,
            "connection_expired",
            True,
        )

    def test_missing_scope_requires_reconnect(self, env):
        env.connect(Platform.LINKEDIN, scopes=frozenset({"profile"}))
        row = env.service.availability(OWNER, Platform.LINKEDIN)
        assert (row.state, row.reason_code) == (AccessState.RECONNECT_REQUIRED, "missing_permission")

    def test_connected_platform_is_available(self, env):
        env.connect(Platform.LINKEDIN, expires_at=NOW + timedelta(days=1))
        row = env.service.availability(OWNER, Platform.LINKEDIN)
        assert (row.state, row.can_publish) == (AccessState.AVAILABLE, True)

    def test_default_adapters_never_pretend_to_publish(self):
        service = SocialService(default_adapters(), InMemoryConnectionStore(), InMemoryPublicationStore(), {}, {})
        rows = {p: service.availability(OWNER, p) for p in Platform}
        assert {p: (r.state, r.reason_code) for p, r in rows.items()} == {
            Platform.LINKEDIN: (AccessState.ACCESS_UNAVAILABLE, "linkedin_app_unavailable"),
            Platform.X: (AccessState.ACCESS_UNAVAILABLE, "x_api_credits_unavailable"),
        }
        assert not any(r.can_publish or r.can_connect for r in rows.values())


class TestPublish:
    def test_success_requires_provider_confirmation_and_sends_approved_content(self, ready):
        publication, replayed = publish(ready)
        assert not replayed
        assert publication.status is PublicationStatus.SUCCEEDED
        assert publication.url == "https://example.test/linkedin/post-1"
        [sent] = ready.adapters[Platform.LINKEDIN].published
        assert (sent.body, sent.photo.data) == ("Texto d-li", b"jpeg")

    def test_same_key_replays_without_second_post(self, ready):
        first, _ = publish(ready)
        again, replayed = publish(ready)
        assert replayed and again == first
        assert len(ready.adapters[Platform.LINKEDIN].published) == 1

    def test_same_key_for_different_request_is_rejected(self, ready):
        publish(ready)
        ready.add_draft("d-li", Platform.LINKEDIN, revision=2)
        with pytest.raises(Conflict) as error:
            publish(ready, revision=2)
        assert error.value.code == "idempotency_key_reused"

    def test_new_key_after_success_does_not_duplicate(self, ready):
        publish(ready)
        with pytest.raises(Conflict) as error:
            publish(ready, key="k2")
        assert error.value.code == "already_published"
        assert error.value.extra["url"] == "https://example.test/linkedin/post-1"
        assert len(ready.adapters[Platform.LINKEDIN].published) == 1

    @pytest.mark.parametrize(
        ("kwargs", "error_type", "code"),
        [
            ({"key": None}, InvalidRequest, "idempotency_key_required"),
            ({"key": "x" * 256}, InvalidRequest, "invalid_idempotency_key"),
            ({"confirmed": False}, InvalidRequest, "confirmation_required"),
            ({"revision": 7}, Conflict, "stale_revision"),
            ({"draft_id": "missing"}, NotFound, "draft_not_found"),
        ],
    )
    def test_invalid_requests_never_reach_provider(self, ready, kwargs, error_type, code):
        with pytest.raises(error_type) as error:
            publish(ready, **kwargs)
        assert error.value.code == code
        assert ready.adapters[Platform.LINKEDIN].published == []

    def test_unavailable_platform_keeps_draft_and_explains(self, env):
        env.add_draft("d-x", Platform.X)
        with pytest.raises(Conflict) as error:
            publish(env, draft_id="d-x")
        assert error.value.code == "platform_unavailable"
        assert error.value.extra["availability"]["state"] == "connection_missing"
        assert env.adapters[Platform.X].published == []

    def test_retryable_rejection_allows_new_attempt(self, ready):
        adapter = ready.adapters[Platform.LINKEDIN]
        adapter.outcome = ProviderOutcome.rejected("rate_limited", "Probá en un rato", retryable=True)
        failed, _ = publish(ready)
        assert failed.status is PublicationStatus.FAILED and failed.error.retryable
        adapter.outcome = ProviderOutcome.succeeded("post-2")
        retried, _ = publish(ready, key="k2")
        assert retried.status is PublicationStatus.SUCCEEDED and retried.id != failed.id

    def test_non_retryable_rejection_blocks_same_revision(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.rejected(
            "content_rejected", "Rechazado", retryable=False
        )
        publish(ready)
        with pytest.raises(Conflict) as error:
            publish(ready, key="k2")
        assert error.value.code == "not_retryable"

    def test_success_without_post_id_is_not_shown_as_published(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded(None)
        publication, _ = publish(ready)
        assert publication.status is PublicationStatus.UNKNOWN
        assert publication.error.code == "unconfirmed_result"


class TestUnknownResults:
    @pytest.fixture
    def unknown(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = TimeoutError("read timeout")
        publication, _ = publish(ready)
        assert publication.status is PublicationStatus.UNKNOWN
        return publication

    def test_blocks_new_send_until_reconciled(self, ready, unknown):
        with pytest.raises(Conflict) as error:
            publish(ready, key="k2")
        assert error.value.code == "reconciliation_required"
        assert len(ready.adapters[Platform.LINKEDIN].published) == 1

    def test_reconciles_from_provider_on_read(self, ready, unknown):
        ready.adapters[Platform.LINKEDIN].lookup_outcome = ProviderOutcome.succeeded("post-9", "https://example.test/9")
        publication = ready.service.get(OWNER, unknown.id)
        assert (publication.status, publication.url) == (PublicationStatus.SUCCEEDED, "https://example.test/9")

    def test_reconciles_before_allowing_new_send(self, ready, unknown):
        ready.adapters[Platform.LINKEDIN].lookup_outcome = ProviderOutcome.rejected(
            "not_found", "No llegó", retryable=True
        )
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded("post-2")
        publication, _ = publish(ready, key="k2")
        assert publication.status is PublicationStatus.SUCCEEDED

    def test_user_confirmation_unlocks_retry(self, ready, unknown):
        resolved = ready.service.resolve_not_published(OWNER, unknown.id)
        assert (resolved.status, resolved.error.code) == (PublicationStatus.FAILED, "confirmed_not_published")
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded("post-2")
        publication, _ = publish(ready, key="k2")
        assert publication.status is PublicationStatus.SUCCEEDED

    def test_only_unknown_can_be_resolved(self, ready):
        publication, _ = publish(ready)
        with pytest.raises(Conflict):
            ready.service.resolve_not_published(OWNER, publication.id)


def test_platforms_keep_independent_results(env):
    env.connect(Platform.LINKEDIN)
    env.connect(Platform.X)
    env.add_draft("d-li", Platform.LINKEDIN)
    env.add_draft("d-x", Platform.X)
    env.adapters[Platform.X].outcome = ProviderOutcome.rejected("server_error", "X falló", retryable=True)

    linkedin, _ = publish(env, draft_id="d-li", key="li-1")
    x, _ = publish(env, draft_id="d-x", key="x-1")
    assert (linkedin.status, x.status) == (PublicationStatus.SUCCEEDED, PublicationStatus.FAILED)

    with pytest.raises(Conflict):
        publish(env, draft_id="d-li", key="li-2")
    env.adapters[Platform.X].outcome = ProviderOutcome.succeeded("x-post")
    x_retry, _ = publish(env, draft_id="d-x", key="x-2")
    assert x_retry.status is PublicationStatus.SUCCEEDED
    assert env.service.get(OWNER, linkedin.id).url == "https://example.test/linkedin/post-1"


def test_publications_are_private_to_their_owner(ready):
    publication, _ = publish(ready)
    with pytest.raises(NotFound):
        ready.service.get("intruder", publication.id)


def test_double_click_while_publishing_sends_once(ready):
    adapter = ready.adapters[Platform.LINKEDIN]
    entered, release = threading.Event(), threading.Event()

    def hold():
        entered.set()
        release.wait(timeout=5)

    adapter.before_publish = hold
    results = {}
    worker = threading.Thread(target=lambda: results.update(first=publish(ready)))
    worker.start()
    assert entered.wait(timeout=5)

    replay, replayed = publish(ready)
    assert replayed and replay.status is PublicationStatus.PUBLISHING
    with pytest.raises(Conflict) as error:
        publish(ready, key="k2")
    assert error.value.code == "publication_in_progress"

    release.set()
    worker.join(timeout=5)
    assert results["first"][0].status is PublicationStatus.SUCCEEDED
    assert len(adapter.published) == 1


class TestAssistedShare:
    TEXT = "Logro en Jujuy: ¡ganamos! #TrenSolar & más\nhttps://example.test/a?b=1"

    def test_every_state_offers_assisted_share_without_photo(self, env):
        rows = [env.service.availability(OWNER, p) for p in Platform]
        assert {r.platform: (r.assisted_share.official, r.assisted_share.attaches_photo) for r in rows} == {
            Platform.X: (True, False),
            Platform.LINKEDIN: (False, False),
        }

    @pytest.mark.parametrize(
        ("platform", "base", "extra"),
        [
            (Platform.X, "https://x.com/intent/post", {}),
            (Platform.LINKEDIN, "https://www.linkedin.com/feed/", {"shareActive": ["true"]}),
        ],
    )
    def test_composer_url_carries_exact_draft_text(self, env, platform, base, extra):
        env.add_draft("d", platform, revision=3, body=self.TEXT)
        share = env.service.assisted_share(OWNER, "d")
        url = urlsplit(share.composer_url)
        assert f"{url.scheme}://{url.netloc}{url.path}" == base
        assert parse_qs(url.query) == {**extra, "text": [self.TEXT]}
        assert "+" not in url.query
        assert (share.text, share.draft_revision, share.photo_id, share.attaches_photo) == (
            self.TEXT,
            3,
            "photo-1",
            False,
        )
        assert "no podemos confirmar" in share.notice

    def test_assisted_share_never_creates_a_publication(self, env):
        env.add_draft("d-x", Platform.X)
        env.service.assisted_share(OWNER, "d-x")
        assert env.adapters[Platform.X].published == []
        with pytest.raises(NotFound):
            env.service.get(OWNER, "pub-1")

    def test_assisted_share_is_private(self, env):
        env.add_draft("d-x", Platform.X)
        with pytest.raises(NotFound):
            env.service.assisted_share("intruder", "d-x")

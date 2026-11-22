from __future__ import annotations

import threading
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import pytest
from conftest import KEY, NOW, OWNER
from social.adapters import default_adapters
from social.memory import InMemoryConnectionStore, InMemoryPublicationStore
from social.models import ConnectionState, Platform, ProviderOutcome, PublicationStatus
from social.service import Conflict, InvalidRequest, NotFound, SocialService

KEY2 = "key-00000002"


def publish(env, draft_id="d-li", key=KEY, revision=1, confirm=True, owner=OWNER):
    return env.service.publish(owner, draft_id, key, revision, confirm)


@pytest.fixture
def ready(env):
    env.connect(Platform.LINKEDIN, account_handle="Mayko")
    env.add_draft("d-li", Platform.LINKEDIN)
    return env


class TestConnectionStatus:
    def test_provider_block_wins_over_connection(self, env):
        env.connect(Platform.X)
        env.adapters[Platform.X].reason = "Sin créditos"
        row = env.service.connection_status(OWNER, Platform.X)
        assert (row.status, row.can_publish_text, row.can_publish_image, row.reason) == (
            ConnectionState.ACCESS_UNAVAILABLE,
            False,
            False,
            "Sin créditos",
        )

    def test_missing_connection_is_disconnected(self, env):
        row = env.service.connection_status(OWNER, Platform.LINKEDIN)
        assert (row.status, row.can_publish_text) == (ConnectionState.DISCONNECTED, False)

    def test_expired_connection(self, env):
        env.connect(Platform.LINKEDIN, expires_at=NOW - timedelta(seconds=1), account_handle="Mayko")
        row = env.service.connection_status(OWNER, Platform.LINKEDIN)
        assert (row.status, row.account_handle, row.can_publish_text) == (ConnectionState.EXPIRED, "Mayko", False)

    def test_missing_scope_requires_reconnecting(self, env):
        env.connect(Platform.LINKEDIN, scopes=frozenset({"profile"}))
        row = env.service.connection_status(OWNER, Platform.LINKEDIN)
        assert row.status is ConnectionState.DISCONNECTED and "permiso" in row.reason

    @pytest.mark.parametrize("supports_image", [True, False])
    def test_connected_reports_real_capabilities(self, env, supports_image):
        env.adapters[Platform.LINKEDIN].supports_image = supports_image
        env.connect(Platform.LINKEDIN, expires_at=NOW + timedelta(days=1), account_handle="Mayko")
        row = env.service.connection_status(OWNER, Platform.LINKEDIN)
        assert (row.status, row.can_publish_text, row.can_publish_image, row.account_handle) == (
            ConnectionState.CONNECTED,
            True,
            supports_image,
            "Mayko",
        )

    def test_default_adapters_never_pretend_to_publish(self):
        service = SocialService(default_adapters(), InMemoryConnectionStore(), InMemoryPublicationStore(), {})
        rows = [service.connection_status(OWNER, p) for p in Platform]
        assert all(r.status is ConnectionState.ACCESS_UNAVAILABLE and r.reason for r in rows)
        assert not any(r.can_publish_text or r.can_publish_image for r in rows)


class TestPublish:
    def test_success_requires_provider_confirmation_and_sends_approved_draft(self, ready):
        publication, replayed = publish(ready)
        assert not replayed
        assert (publication.status, publication.external_url, publication.idempotency_key) == (
            PublicationStatus.SUCCEEDED,
            "https://example.test/linkedin/post-1",
            KEY,
        )
        assert publication.published_at == NOW
        [sent] = ready.adapters[Platform.LINKEDIN].published
        assert (sent.body, sent.media.local_path) == ("Texto d-li", "/private/med_1.jpg")

    def test_text_only_draft(self, ready):
        ready.add_draft("d-li", Platform.LINKEDIN, with_photo=False)
        ready.adapters[Platform.LINKEDIN].supports_image = False
        publication, _ = publish(ready)
        assert publication.status is PublicationStatus.SUCCEEDED

    def test_photo_blocked_when_network_cannot_post_images(self, ready):
        ready.adapters[Platform.LINKEDIN].supports_image = False
        with pytest.raises(Conflict) as error:
            publish(ready)
        assert error.value.code == "IMAGE_UNAVAILABLE"
        assert ready.adapters[Platform.LINKEDIN].published == []

    def test_same_key_replays_without_second_post(self, ready):
        first, _ = publish(ready)
        again, replayed = publish(ready)
        assert replayed and again == first
        assert len(ready.adapters[Platform.LINKEDIN].published) == 1

    def test_same_key_for_different_revision_is_rejected(self, ready):
        publish(ready)
        ready.add_draft("d-li", Platform.LINKEDIN, revision=2)
        with pytest.raises(Conflict) as error:
            publish(ready, revision=2)
        assert error.value.code == "IDEMPOTENCY_KEY_REUSED"

    def test_new_key_after_success_does_not_duplicate(self, ready):
        publish(ready)
        with pytest.raises(Conflict) as error:
            publish(ready, key=KEY2)
        assert error.value.code == "ALREADY_PUBLISHED"
        assert error.value.extra["external_url"] == "https://example.test/linkedin/post-1"
        assert len(ready.adapters[Platform.LINKEDIN].published) == 1

    @pytest.mark.parametrize(
        ("kwargs", "error_type", "code"),
        [
            ({"key": None}, InvalidRequest, "IDEMPOTENCY_KEY_REQUIRED"),
            ({"key": "short"}, InvalidRequest, "INVALID_IDEMPOTENCY_KEY"),
            ({"key": "x" * 256}, InvalidRequest, "INVALID_IDEMPOTENCY_KEY"),
            ({"confirm": False}, InvalidRequest, "CONFIRMATION_REQUIRED"),
            ({"revision": 7}, Conflict, "REVISION_CONFLICT"),
            ({"draft_id": "missing"}, NotFound, "DRAFT_NOT_FOUND"),
        ],
    )
    def test_invalid_requests_never_reach_provider(self, ready, kwargs, error_type, code):
        with pytest.raises(error_type) as error:
            publish(ready, **kwargs)
        assert error.value.code == code
        assert ready.adapters[Platform.LINKEDIN].published == []

    @pytest.mark.parametrize(("blocked", "code"), [(True, "ACCESS_UNAVAILABLE"), (False, "CONNECTION_REQUIRED")])
    def test_unavailable_platform_explains_and_keeps_draft(self, env, blocked, code):
        env.add_draft("d-x", Platform.X)
        if blocked:
            env.adapters[Platform.X].reason = "Sin créditos"
        with pytest.raises(Conflict) as error:
            publish(env, draft_id="d-x")
        assert error.value.code == code
        assert error.value.extra["connection"]["platform"] == "x"
        assert env.adapters[Platform.X].published == []

    def test_retryable_rejection_allows_new_attempt(self, ready):
        adapter = ready.adapters[Platform.LINKEDIN]
        adapter.outcome = ProviderOutcome.rejected("OAUTH_TOKEN_EXPIRED", "Reconectá", retryable=True)
        failed, _ = publish(ready)
        assert failed.status is PublicationStatus.FAILED and failed.error.retryable
        adapter.outcome = ProviderOutcome.succeeded("post-2")
        retried, _ = publish(ready, key=KEY2)
        assert retried.status is PublicationStatus.SUCCEEDED and retried.id != failed.id

    def test_non_retryable_rejection_blocks_same_revision(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.rejected("CONTENT_REJECTED", "No", retryable=False)
        publish(ready)
        with pytest.raises(Conflict) as error:
            publish(ready, key=KEY2)
        assert error.value.code == "NOT_RETRYABLE"

    def test_success_without_post_id_is_not_shown_as_published(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded(None)
        publication, _ = publish(ready)
        assert (publication.status, publication.error.code) == (
            PublicationStatus.UNKNOWN,
            "PROVIDER_RESULT_UNCONFIRMED",
        )


class TestUnknownResults:
    @pytest.fixture
    def unknown(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = TimeoutError("read timeout")
        publication, _ = publish(ready)
        assert (publication.status, publication.error.code, publication.error.retryable) == (
            PublicationStatus.UNKNOWN,
            "PROVIDER_TIMEOUT_AFTER_SEND",
            False,
        )
        return publication

    def test_unexpected_provider_error_is_unknown(self, ready):
        ready.adapters[Platform.LINKEDIN].outcome = RuntimeError("boom")
        publication, _ = publish(ready)
        assert (publication.status, publication.error.code) == (PublicationStatus.UNKNOWN, "PROVIDER_RESULT_UNKNOWN")

    def test_blocks_new_send_until_reconciled(self, ready, unknown):
        with pytest.raises(Conflict) as error:
            publish(ready, key=KEY2)
        assert error.value.code == "RECONCILIATION_REQUIRED"
        assert len(ready.adapters[Platform.LINKEDIN].published) == 1

    def test_reconciles_from_provider_on_read(self, ready, unknown):
        ready.adapters[Platform.LINKEDIN].lookup_outcome = ProviderOutcome.succeeded("post-9", "https://example.test/9")
        publication = ready.service.get(OWNER, unknown.id)
        assert (publication.status, publication.external_url) == (PublicationStatus.SUCCEEDED, "https://example.test/9")

    def test_reconciles_before_allowing_new_send(self, ready, unknown):
        adapter = ready.adapters[Platform.LINKEDIN]
        adapter.lookup_outcome = ProviderOutcome.rejected("NOT_FOUND", "No llegó", retryable=True)
        adapter.outcome = ProviderOutcome.succeeded("post-2")
        publication, _ = publish(ready, key=KEY2)
        assert publication.status is PublicationStatus.SUCCEEDED

    def test_user_confirmation_unlocks_retry(self, ready, unknown):
        resolved = ready.service.resolve_not_published(OWNER, unknown.id)
        assert (resolved.status, resolved.error.code) == (PublicationStatus.FAILED, "CONFIRMED_NOT_PUBLISHED")
        ready.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded("post-2")
        publication, _ = publish(ready, key=KEY2)
        assert publication.status is PublicationStatus.SUCCEEDED

    def test_only_unknown_can_be_resolved(self, ready):
        publication, _ = publish(ready)
        with pytest.raises(Conflict):
            ready.service.resolve_not_published(OWNER, publication.id)


class TestAssistedShare:
    TEXT = "Logro en Jujuy: ¡ganamos! #TrenSolar & más\nhttps://example.test/a?b=1"

    def test_every_state_offers_assisted_share_without_photo(self, env):
        rows = [env.service.connection_status(OWNER, p) for p in Platform]
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
            "med_1",
            False,
        )
        assert "no podemos confirmar" in share.notice

    def test_text_only_draft_has_no_photo(self, env):
        env.add_draft("d", Platform.X, with_photo=False)
        assert env.service.assisted_share(OWNER, "d").photo_id is None

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


def test_platforms_keep_independent_results(env):
    env.connect(Platform.LINKEDIN)
    env.connect(Platform.X)
    env.add_draft("d-li", Platform.LINKEDIN)
    env.add_draft("d-x", Platform.X)
    env.adapters[Platform.X].outcome = ProviderOutcome.rejected("SERVER_ERROR", "X falló", retryable=True)

    linkedin, _ = publish(env, draft_id="d-li", key="li-key-0001")
    x, _ = publish(env, draft_id="d-x", key="x-key-00001")
    assert (linkedin.status, x.status) == (PublicationStatus.SUCCEEDED, PublicationStatus.FAILED)

    with pytest.raises(Conflict):
        publish(env, draft_id="d-li", key="li-key-0002")
    env.adapters[Platform.X].outcome = ProviderOutcome.succeeded("x-post")
    x_retry, _ = publish(env, draft_id="d-x", key="x-key-00002")
    assert x_retry.status is PublicationStatus.SUCCEEDED
    assert env.service.get(OWNER, linkedin.id).external_url == "https://example.test/linkedin/post-1"


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
        publish(ready, key=KEY2)
    assert error.value.code == "PUBLICATION_IN_PROGRESS"

    release.set()
    worker.join(timeout=5)
    assert results["first"][0].status is PublicationStatus.SUCCEEDED
    assert len(adapter.published) == 1

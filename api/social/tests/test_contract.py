from __future__ import annotations

import pytest
from conftest import fixture
from social.models import Platform, Publication, PublishableDraft, SocialConnectionStatus


@pytest.mark.parametrize("example", ["with_photo_example", "text_only_example"])
def test_accepts_handoff_from_issue_3(example):
    payload = fixture("06-handoff-publishable-draft-to-social.json")[example]
    draft = PublishableDraft.from_handoff(payload)
    assert (draft.draft_id, draft.platform, draft.body) == (
        payload["draft_id"],
        Platform(payload["platform"]),
        payload["body"],
    )
    assert (draft.media is None) == (payload["media"] is None)


@pytest.mark.parametrize("example", ["linkedin_connected", "x_access_unavailable"])
def test_connection_fixtures_match_model(example):
    payload = fixture("07-social-connections.response.json")[example]
    assert SocialConnectionStatus.model_validate(payload).model_dump(mode="json").items() >= payload.items()


def test_connection_accepts_can_read_posts_from_onboarding_contract():
    payload = {
        "platform": "linkedin",
        "status": "connected",
        "can_publish_text": True,
        "can_publish_image": True,
        "can_read_posts": True,
        "account_handle": "Ana Gómez",
        "reason": None,
    }
    assert SocialConnectionStatus.model_validate(payload).model_dump(mode="json").items() >= payload.items()


@pytest.mark.parametrize("example", ["succeeded", "unknown_timeout", "failed_recoverable"])
def test_publication_fixtures_match_model(example):
    payload = fixture("08-publications-states.response.json")["responses"][example]
    dumped = Publication.model_validate(payload).model_dump(mode="json")
    assert {**dumped, "published_at": payload["published_at"]} == payload

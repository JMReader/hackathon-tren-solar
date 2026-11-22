from __future__ import annotations

import httpx2
import pytest
from fastapi.testclient import TestClient
from social.apify import ApifyConfig
from social.crypto import TokenCipher
from social.linkedin import LinkedInConfig
from social.settings import Settings as SocialSettings

from app.llm.fake import FakeLLM
from app.main import Services, create_app
from app.stt.fake import FakeTranscriber
from tests.conftest import complete_onboarding

POSTS = ["Terminamos la demo del tren solar a las 4am.", "Aprendí más en 48 horas de hackatón que en un mes."]


def fake_providers(request: httpx2.Request) -> httpx2.Response:
    if request.url.host == "api.apify.com":
        return httpx2.Response(
            201,
            json=[
                {"type": "post", "content": text, "author": {"publicIdentifier": "mayko-dev", "name": "Mayko"}}
                for text in POSTS
            ],
        )
    if request.url.path == "/oauth/v2/accessToken":
        return httpx2.Response(
            200, json={"access_token": "tok", "expires_in": 3600, "scope": "openid profile w_member_social"}
        )
    if request.url.path == "/v2/userinfo":
        return httpx2.Response(200, json={"sub": "m-1", "name": "Mayko Fernández"})
    return httpx2.Response(404)


@pytest.fixture
def client(settings, monkeypatch) -> TestClient:
    monkeypatch.delenv("FAKE_STYLE_POSTS", raising=False)
    social = SocialSettings(
        token_key=TokenCipher.generate_key(),
        web_base_url="http://web.test",
        linkedin=LinkedInConfig("cid", "secret", "http://localhost:8000/api/v1/social/linkedin/callback"),
        apify=ApifyConfig("apify-token"),
    )
    services = Services(
        settings,
        llm=FakeLLM(),
        transcriber=FakeTranscriber(),
        social_settings=social,
        social_http=httpx2.Client(transport=httpx2.MockTransport(fake_providers)),
    )
    return TestClient(create_app(services), follow_redirects=False)


def test_linkedin_posts_are_imported_from_the_users_own_profile_url(client):
    auth = {"X-Session-Id": client.post("/api/v1/session").json()["session_id"]}
    start = client.post("/api/v1/social/linkedin/connection", headers=auth, json={"return_to": "/?step=2"}).json()
    client.get("/api/v1/social/linkedin/callback", params={"state": start["state"], "code": "c1"})
    status = client.get("/api/v1/social/linkedin/connection", headers=auth).json()
    assert (status["status"], status["can_read_posts"]) == ("connected", True)

    missing = client.post("/api/v1/session/profile/sync-style", headers=auth, json={"platforms": ["linkedin"]})
    assert missing.status_code == 503
    assert missing.json()["style_sync"]["linkedin"]["status"] == "unavailable"

    synced = client.post(
        "/api/v1/session/profile/sync-style",
        headers=auth,
        json={"platforms": ["linkedin"], "linkedin_profile_url": "https://www.linkedin.com/in/mayko-dev/"},
    )
    assert synced.status_code == 200, synced.text
    assert synced.json()["style_sync"]["linkedin"] == {"status": "succeeded", "posts_imported": 2, "message": None}

    profile = complete_onboarding(client, auth, writing_sample=None)
    voice = client.get("/api/v1/session/profile", headers=profile).json()["voice_context"]
    assert voice["sample_posts"]["linkedin"] == POSTS

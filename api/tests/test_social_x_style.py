from __future__ import annotations

import httpx2
import pytest
from fastapi.testclient import TestClient
from social.crypto import TokenCipher
from social.settings import Settings as SocialSettings
from social.x import XConfig

from app.llm.fake import FakeLLM
from app.main import Services, create_app
from app.stt.fake import FakeTranscriber
from tests.conftest import complete_onboarding

POSTS = ["armé el flujo de turnos en 3 pasos. menos vueltas.", "hoy probé whisper en español y anda joya"]


def fake_x(request: httpx2.Request) -> httpx2.Response:
    path = request.url.path
    if path == "/2/oauth2/token":
        return httpx2.Response(
            200,
            json={
                "access_token": "tok",
                "refresh_token": "ref",
                "expires_in": 7200,
                "scope": "tweet.read tweet.write users.read media.write offline.access",
            },
        )
    if path == "/2/users/me":
        return httpx2.Response(200, json={"data": {"id": "u1", "username": "mayko2003"}})
    if path == "/2/users/u1/tweets":
        assert request.url.params["exclude"] == "replies,retweets"
        return httpx2.Response(
            200, json={"data": [{"id": str(i), "text": f"{text} https://t.co/abc"} for i, text in enumerate(POSTS)]}
        )
    return httpx2.Response(404)


@pytest.fixture
def xclient(settings, monkeypatch) -> TestClient:
    monkeypatch.delenv("FAKE_STYLE_POSTS", raising=False)
    social = SocialSettings(
        token_key=TokenCipher.generate_key(),
        web_base_url="http://web.test",
        x=XConfig("cid", "secret", "http://localhost:8000/api/v1/social/x/callback"),
    )
    services = Services(
        settings,
        llm=FakeLLM(),
        transcriber=FakeTranscriber(),
        social_settings=social,
        social_http=httpx2.Client(transport=httpx2.MockTransport(fake_x)),
    )
    return TestClient(create_app(services), follow_redirects=False)


def test_connecting_x_imports_posts_into_the_author_voice(xclient):
    auth = {"X-Session-Id": xclient.post("/api/v1/session").json()["session_id"]}
    start = xclient.post("/api/v1/social/x/connection", headers=auth, json={"return_to": "/?step=2"}).json()
    callback = xclient.get("/api/v1/social/x/callback", params={"state": start["state"], "code": "c1"})
    assert callback.status_code == 302 and "connected=x" in callback.headers["location"]

    status = xclient.get("/api/v1/social/x/connection", headers=auth).json()
    assert (status["status"], status["can_read_posts"]) == ("connected", True)

    synced = xclient.post("/api/v1/session/profile/sync-style", headers=auth, json={"platforms": ["x"]})
    assert synced.status_code == 200, synced.text
    assert synced.json()["style_sync"]["x"] == {"status": "succeeded", "posts_imported": 2, "message": None}

    profile = complete_onboarding(xclient, auth, writing_sample=None)
    voice = xclient.get("/api/v1/session/profile", headers=profile).json()["voice_context"]
    assert voice["sample_posts"]["x"] == POSTS

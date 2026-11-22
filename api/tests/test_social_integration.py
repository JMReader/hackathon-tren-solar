from __future__ import annotations

import json
from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from fastapi.testclient import TestClient

from app.llm.fake import FakeLLM
from app.main import Services, create_app
from app.stt.fake import FakeTranscriber
from social.crypto import TokenCipher
from social.linkedin import LinkedInConfig
from social.settings import Settings as SocialSettings
from tests.conftest import PNG_BYTES, approve, complete_onboarding, create_text, gen_drafts, upload_photo

TOKEN_KEY = TokenCipher.generate_key()
SOCIAL = SocialSettings(
    token_key=TOKEN_KEY,
    web_base_url="http://web.test",
    linkedin=LinkedInConfig("cid", "secret", "http://localhost:8000/api/v1/social/linkedin/callback"),
)


class FakeLinkedIn:
    def __init__(self) -> None:
        self.posts: list[dict] = []
        self.uploads: list[bytes] = []

    def __call__(self, request: httpx2.Request) -> httpx2.Response:
        path = request.url.path
        if path == "/oauth/v2/accessToken":
            return httpx2.Response(
                200, json={"access_token": "tok", "expires_in": 3600, "scope": "openid profile w_member_social"}
            )
        if path == "/v2/userinfo":
            return httpx2.Response(200, json={"sub": "member-1", "name": "Mayko"})
        if path == "/rest/images":
            return httpx2.Response(
                200, json={"value": {"uploadUrl": "https://upload.test/img", "image": "urn:li:image:I1"}}
            )
        if request.url.host == "upload.test":
            self.uploads.append(request.content)
            return httpx2.Response(201)
        if path == "/rest/posts":
            self.posts.append(json.loads(request.content))
            return httpx2.Response(201, headers={"x-restli-id": f"urn:li:share:{len(self.posts)}"})
        return httpx2.Response(404)


@pytest.fixture
def linkedin() -> FakeLinkedIn:
    return FakeLinkedIn()


@pytest.fixture
def social_services(settings, linkedin, monkeypatch) -> Services:
    monkeypatch.delenv("FAKE_STYLE_POSTS", raising=False)
    return Services(
        settings,
        llm=FakeLLM(),
        transcriber=FakeTranscriber(),
        social_settings=SOCIAL,
        social_http=httpx2.Client(transport=httpx2.MockTransport(linkedin)),
    )


@pytest.fixture
def sclient(social_services) -> TestClient:
    return TestClient(create_app(social_services), follow_redirects=False)


def new_session(client: TestClient) -> dict[str, str]:
    resp = client.post("/api/v1/session")
    assert resp.status_code == 201, resp.text
    return {"X-Session-Id": resp.json()["session_id"]}


def drafts_with_photo(client: TestClient, auth: dict) -> dict[str, dict]:
    complete_onboarding(client, auth)
    achievement = approve(client, auth, create_text(client, auth, photo_id=upload_photo(client, auth, "Pantallas")))
    return {d["platform"]: d for d in gen_drafts(client, auth, achievement)["drafts"]}


def connect_linkedin(client: TestClient, auth: dict) -> None:
    start = client.post("/api/v1/social/linkedin/connection", headers=auth, json={"return_to": "/?step=2"})
    assert start.status_code == 200, start.text
    callback = client.get(
        "/api/v1/social/linkedin/callback", params={"state": start.json()["state"], "code": "code-1"}
    )
    assert callback.status_code == 302
    location = urlsplit(callback.headers["location"])
    assert (location.netloc, location.path) == ("web.test", "/")
    assert parse_qs(location.query) == {
        "step": ["2"],
        "social": ["linkedin"],
        "result": ["connected"],
        "connected": ["linkedin"],
    }


def publish(client: TestClient, auth: dict, draft: dict, key: str = "key-00000001"):
    return client.post(
        f"/api/v1/drafts/{draft['id']}/publications",
        headers={**auth, "Idempotency-Key": key},
        json={"draft_revision": draft["revision"], "confirm_publish": True},
    )


def test_social_routes_require_session(sclient):
    resp = sclient.get("/api/v1/social/linkedin/connection")
    assert (resp.status_code, resp.json()["error"]["code"]) == (401, "session_missing")


def test_generated_draft_is_published_to_linkedin_with_photo(sclient, linkedin):
    auth = new_session(sclient)
    drafts = drafts_with_photo(sclient, auth)
    connect_linkedin(sclient, auth)

    status = sclient.get("/api/v1/social/linkedin/connection", headers=auth).json()
    assert (status["status"], status["account_handle"], status["can_read_posts"]) == ("connected", "Mayko", False)

    first = publish(sclient, auth, drafts["linkedin"])
    assert first.status_code == 200, first.text
    assert first.json()["external_url"] == "https://www.linkedin.com/feed/update/urn:li:share:1/"
    [post] = linkedin.posts
    assert post["author"] == "urn:li:person:member-1"
    assert post["content"] == {"media": {"id": "urn:li:image:I1", "altText": "Pantallas"}}
    assert linkedin.uploads == [PNG_BYTES]

    replay = publish(sclient, auth, drafts["linkedin"])
    assert (replay.status_code, replay.headers["idempotent-replayed"]) == (200, "true")
    assert replay.json() == first.json()
    assert len(linkedin.posts) == 1


def test_x_offers_assisted_share_with_generated_text(sclient):
    auth = new_session(sclient)
    draft = drafts_with_photo(sclient, auth)["x"]

    blocked = publish(sclient, auth, draft)
    assert (blocked.status_code, blocked.json()["error"]["code"]) == (409, "ACCESS_UNAVAILABLE")

    share = sclient.get(f"/api/v1/drafts/{draft['id']}/assisted-share", headers=auth).json()
    assert parse_qs(urlsplit(share["composer_url"]).query)["text"] == [draft["body"]]
    assert share["photo_id"] == draft["photo_id"]


def test_drafts_and_publications_are_private_to_the_session(sclient):
    owner = new_session(sclient)
    draft = drafts_with_photo(sclient, owner)["linkedin"]
    connect_linkedin(sclient, owner)
    publication = publish(sclient, owner, draft).json()

    intruder = new_session(sclient)
    connect_linkedin(sclient, intruder)
    stolen = publish(sclient, intruder, draft, key="key-intruder")
    assert (stolen.status_code, stolen.json()["error"]["code"]) == (404, "DRAFT_NOT_FOUND")
    assert sclient.get(f"/api/v1/publications/{publication['id']}", headers=intruder).status_code == 404


def test_edited_draft_requires_new_confirmation(sclient):
    auth = new_session(sclient)
    draft = drafts_with_photo(sclient, auth)["linkedin"]
    connect_linkedin(sclient, auth)
    edited = sclient.patch(
        f"/api/v1/drafts/{draft['id']}", headers=auth, json={"revision": draft["revision"], "body": "Texto editado"}
    )
    assert edited.status_code == 200, edited.text

    stale = publish(sclient, auth, draft)
    assert (stale.status_code, stale.json()["error"]["code"]) == (409, "REVISION_CONFLICT")


def test_style_sync_reports_social_capabilities(sclient):
    auth = new_session(sclient)
    before = sclient.post("/api/v1/session/profile/sync-style", headers=auth, json={})
    assert before.status_code == 503
    assert before.json()["style_sync"]["linkedin"]["status"] == "skipped"

    connect_linkedin(sclient, auth)
    after = sclient.post("/api/v1/session/profile/sync-style", headers=auth, json={}).json()
    assert after["style_sync"]["linkedin"]["status"] == "unavailable"
    assert "muestra de escritura" in after["style_sync"]["linkedin"]["message"]


def test_connection_and_idempotency_survive_restart(settings, linkedin, monkeypatch):
    monkeypatch.delenv("FAKE_STYLE_POSTS", raising=False)

    def app() -> TestClient:
        services = Services(
            settings,
            llm=FakeLLM(),
            transcriber=FakeTranscriber(),
            social_settings=SOCIAL,
            social_http=httpx2.Client(transport=httpx2.MockTransport(linkedin)),
        )
        return TestClient(create_app(services), follow_redirects=False)

    first = app()
    auth = new_session(first)
    draft = drafts_with_photo(first, auth)["linkedin"]
    connect_linkedin(first, auth)
    published = publish(first, auth, draft).json()

    restarted = app()
    assert restarted.get("/api/v1/social/linkedin/connection", headers=auth).json()["status"] == "connected"
    replay = publish(restarted, auth, draft)
    assert (replay.headers["idempotent-replayed"], replay.json()["id"]) == ("true", published["id"])
    assert len(linkedin.posts) == 1


def test_without_social_configuration_linkedin_is_unavailable(settings):
    services = Services(
        settings, llm=FakeLLM(), transcriber=FakeTranscriber(), social_settings=SocialSettings.from_env({})
    )
    client = TestClient(create_app(services))
    status = client.get("/api/v1/social/linkedin/connection", headers=new_session(client)).json()
    assert (status["status"], status["can_publish_text"]) == ("access_unavailable", False)

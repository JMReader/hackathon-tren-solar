from __future__ import annotations

from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from fastapi.testclient import TestClient
from social.crypto import TokenCipher
from social.dev import create_app
from social.linkedin import LinkedInConfig
from social.settings import Settings

KEY = TokenCipher.generate_key()


def linkedin_api(request: httpx2.Request) -> httpx2.Response:
    if request.url.path == "/oauth/v2/accessToken":
        return httpx2.Response(
            200, json={"access_token": "tok", "expires_in": 3600, "scope": "openid profile w_member_social"}
        )
    if request.url.path == "/v2/userinfo":
        return httpx2.Response(200, json={"sub": "member-1", "name": "Mayko"})
    if request.url.path == "/rest/posts":
        return httpx2.Response(201, headers={"x-restli-id": "urn:li:share:42"})
    return httpx2.Response(404)


@pytest.fixture
def client():
    settings = Settings(
        token_key=KEY,
        web_base_url="http://localhost:8000",
        linkedin=LinkedInConfig("cid", "secret", "http://localhost:8000/api/v1/social/linkedin/callback"),
    )
    http = httpx2.Client(transport=httpx2.MockTransport(linkedin_api))
    return TestClient(create_app(settings, http), follow_redirects=False)


def test_linkedin_requires_encryption_key_and_full_config():
    assert Settings.from_env({}).token_key is None
    assert (
        Settings.from_env(
            {"LINKEDIN_CLIENT_ID": "x", "LINKEDIN_CLIENT_SECRET": "y", "LINKEDIN_REDIRECT_URI": "z"}
        ).linkedin
        is None
    )
    assert Settings.from_env({"SOCIAL_TOKEN_KEY": KEY, "LINKEDIN_CLIENT_ID": "x"}).linkedin is None
    settings = Settings.from_env(
        {
            "SOCIAL_TOKEN_KEY": KEY,
            "LINKEDIN_CLIENT_ID": "x",
            "LINKEDIN_CLIENT_SECRET": "y",
            "LINKEDIN_REDIRECT_URI": "z",
        }
    )
    assert (settings.linkedin.api_version, settings.web_base_url) == ("202610", "http://localhost:3000")


def test_dev_app_refuses_to_start_without_encryption_key():
    with pytest.raises(RuntimeError):
        create_app(Settings(token_key=None, web_base_url="http://localhost:8000"))


def test_dev_page_and_blocked_x(client):
    assert client.get("/dev").status_code == 200
    assert client.get("/api/v1/social/x/connection").json()["status"] == "access_unavailable"
    assert client.get("/api/v1/social/linkedin/connection").json()["status"] == "disconnected"


def test_full_linkedin_flow_against_mock_api(client):
    start = client.post("/api/v1/social/linkedin/connection", json={"return_to": "/dev"}).json()
    callback = client.get("/api/v1/social/linkedin/callback", params={"state": start["state"], "code": "code-1"})
    assert callback.status_code == 302
    location = urlsplit(callback.headers["location"])
    assert (location.path, parse_qs(location.query)["result"]) == ("/dev", ["connected"])

    status = client.get("/api/v1/social/linkedin/connection").json()
    assert (status["status"], status["account_handle"], status["can_publish_image"], status["can_read_posts"]) == (
        "connected",
        "Mayko",
        True,
        False,
    )

    draft = client.post("/dev/drafts", data={"platform": "linkedin", "body": "Hola #TrenSolar"}).json()
    published = client.post(
        f"/api/v1/drafts/{draft['draft_id']}/publications",
        json={"draft_revision": 1, "confirm_publish": True},
        headers={"Idempotency-Key": "key-00000001"},
    )
    assert published.status_code == 200
    assert published.json()["external_url"] == "https://www.linkedin.com/feed/update/urn:li:share:42/"


def test_dev_drafts_reject_non_images(client):
    response = client.post(
        "/dev/drafts",
        data={"platform": "linkedin", "body": "hola"},
        files={"photo": ("a.txt", b"text", "text/plain")},
    )
    assert response.status_code == 422

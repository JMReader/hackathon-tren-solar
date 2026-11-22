from __future__ import annotations

from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from fastapi.testclient import TestClient
from social.crypto import TokenCipher
from social.dev import create_app
from social.linkedin import LinkedInConfig
from social.settings import Settings
from social.x import XConfig

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
    if request.url.path == "/2/oauth2/token":
        return httpx2.Response(
            200,
            json={
                "access_token": "xtok",
                "refresh_token": "xref",
                "expires_in": 7200,
                "scope": "tweet.read tweet.write users.read media.write offline.access",
            },
        )
    if request.url.path == "/2/users/me":
        return httpx2.Response(200, json={"data": {"id": "u-1", "name": "Mayko", "username": "mayko2003"}})
    if request.url.path == "/2/tweets":
        return httpx2.Response(201, json={"data": {"id": "1900", "text": "hola"}})
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


def test_x_requires_encryption_key_and_full_config():
    full = {"X_CLIENT_ID": "x", "X_CLIENT_SECRET": "y", "X_REDIRECT_URI": "z"}
    assert Settings.from_env(full).x is None
    assert Settings.from_env({"SOCIAL_TOKEN_KEY": KEY, "X_CLIENT_ID": "x"}).x is None
    assert Settings.from_env({"SOCIAL_TOKEN_KEY": KEY, **full}).x.allow_links is False
    assert Settings.from_env({"SOCIAL_TOKEN_KEY": KEY, **full, "X_ALLOW_LINKS": "1"}).x.allow_links is True


def test_full_x_flow_against_mock_api():
    settings = Settings(
        token_key=KEY,
        web_base_url="http://localhost:8000",
        x=XConfig("cid", "secret", "http://localhost:8000/api/v1/social/x/callback"),
    )
    client = TestClient(
        create_app(settings, httpx2.Client(transport=httpx2.MockTransport(linkedin_api))), follow_redirects=False
    )
    assert client.get("/api/v1/social/x/connection").json()["status"] == "disconnected"
    start = client.post("/api/v1/social/x/connection", json={"return_to": "/dev"}).json()
    assert parse_qs(urlsplit(start["authorization_url"]).query)["code_challenge_method"] == ["S256"]
    callback = client.get("/api/v1/social/x/callback", params={"state": start["state"], "code": "code-1"})
    assert parse_qs(urlsplit(callback.headers["location"]).query)["result"] == ["connected"]

    status = client.get("/api/v1/social/x/connection").json()
    assert (status["status"], status["account_handle"], status["can_publish_image"]) == ("connected", "@mayko2003", True)

    draft = client.post("/dev/drafts", data={"platform": "x", "body": "Hola #TrenSolar"}).json()
    published = client.post(
        f"/api/v1/drafts/{draft['draft_id']}/publications",
        json={"draft_revision": 1, "confirm_publish": True},
        headers={"Idempotency-Key": "key-00000001"},
    )
    assert published.status_code == 200
    assert published.json()["external_url"] == "https://x.com/mayko2003/status/1900"

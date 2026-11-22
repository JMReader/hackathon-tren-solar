from __future__ import annotations

from app.config import Settings

ORIGIN = "http://localhost:3000"


def test_preflight_options(client):
    resp = client.options(
        "/api/v1/session/profile",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "x-session-id",
        })
    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == ORIGIN


def test_simple_request_has_allow_origin(client):
    resp = client.post("/api/v1/session", headers={"Origin": ORIGIN})
    assert resp.status_code == 201
    assert resp.headers["access-control-allow-origin"] == ORIGIN


def test_disallowed_origin_no_header(client):
    resp = client.post("/api/v1/session",
                       headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in resp.headers


def test_cors_origins_from_env():
    s = Settings.from_env({"CORS_ORIGINS": "https://a.app, https://b.app"})
    assert s.cors_origins == ["https://a.app", "https://b.app"]

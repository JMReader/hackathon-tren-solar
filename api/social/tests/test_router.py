from __future__ import annotations

import pytest
from conftest import KEY, OWNER, fixture
from fastapi import FastAPI
from fastapi.testclient import TestClient
from social.models import Platform, ProviderOutcome
from social.oauth import ConnectionFlow
from social.router import create_router


@pytest.fixture
def client(env):
    app = FastAPI()
    flow = ConnectionFlow(env.service, {}, env.connections, "http://web.test")
    app.include_router(create_router(env.service, flow, lambda: OWNER), prefix="/api/v1")
    env.connect(Platform.LINKEDIN)
    env.add_draft("d-li", Platform.LINKEDIN)
    return TestClient(app)


def post(client, key=KEY, **body):
    headers = {"Idempotency-Key": key} if key else {}
    return client.post(
        "/api/v1/drafts/d-li/publications",
        json={"draft_revision": 1, "confirm_publish": True, **body},
        headers=headers,
    )


def test_connection_status(client):
    response = client.get("/api/v1/social/x/connection")
    assert response.status_code == 200
    body = response.json()
    assert (body["status"], body["can_publish_text"], body["can_publish_image"]) == ("disconnected", False, False)
    assert body["assisted_share"] == {"official": True, "attaches_photo": False}


def test_start_connection_returns_503_when_provider_blocks(client, env):
    env.adapters[Platform.X].reason = "Sin créditos"
    response = client.post("/api/v1/social/x/connection")
    assert response.status_code == 503
    assert (response.json()["status"], response.json()["reason"]) == ("access_unavailable", "Sin créditos")


def test_start_connection_is_honest_without_oauth_provider(client):
    response = client.post("/api/v1/social/linkedin/connection", json={"return_to": "/crear"})
    assert response.status_code == 501
    assert response.json()["error"]["code"] == "OAUTH_NOT_IMPLEMENTED"


def test_callback_with_invalid_state_is_400(client):
    response = client.get("/api/v1/social/linkedin/callback", params={"state": "forged", "code": "c"})
    assert (response.status_code, response.json()["error"]["code"]) == (400, "OAUTH_STATE_INVALID")


def test_contract_request_body_publishes_then_replays(client):
    contract = fixture("08-publications-states.response.json")
    created = client.post(
        "/api/v1/drafts/d-li/publications", json=contract["request_body"], headers=contract["request_headers"]
    )
    assert created.status_code == 200
    assert created.json()["status"] == "succeeded"
    replay = client.post(
        "/api/v1/drafts/d-li/publications", json=contract["request_body"], headers=contract["request_headers"]
    )
    assert (replay.status_code, replay.headers["Idempotent-Replayed"]) == (200, "true")
    assert replay.json() == created.json()


def test_unknown_result_is_202_and_can_be_resolved(client, env):
    env.adapters[Platform.LINKEDIN].outcome = TimeoutError()
    response = post(client)
    assert response.status_code == 202
    publication = response.json()
    assert (publication["status"], publication["error"]["code"]) == ("unknown", "PROVIDER_TIMEOUT_AFTER_SEND")

    blocked = post(client, key="key-00000002")
    assert (blocked.status_code, blocked.json()["error"]["code"]) == (409, "RECONCILIATION_REQUIRED")

    resolved = client.post(f"/api/v1/publications/{publication['id']}/resolution", json={"outcome": "not_published"})
    assert resolved.json()["status"] == "failed"

    env.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded("post-2")
    assert post(client, key="key-00000002").status_code == 200


def test_errors_use_contract_api_error_shape(client):
    response = post(client, key=None)
    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "IDEMPOTENCY_KEY_REQUIRED",
            "message": "Falta el encabezado Idempotency-Key.",
            "retryable": False,
        }
    }
    assert client.get("/api/v1/publications/nope").json()["error"]["code"] == "PUBLICATION_NOT_FOUND"


def test_assisted_share_endpoint(client):
    response = client.get("/api/v1/drafts/d-li/assisted-share")
    assert response.status_code == 200
    body = response.json()
    assert body["composer_url"] == "https://www.linkedin.com/feed/?shareActive=true&text=Texto%20d-li"
    assert (body["platform"], body["official"], body["photo_id"]) == ("linkedin", False, "med_1")
    assert client.get("/api/v1/drafts/nope/assisted-share").status_code == 404

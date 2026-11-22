from __future__ import annotations

import pytest
from conftest import OWNER
from fastapi import FastAPI
from fastapi.testclient import TestClient
from social.models import Platform, ProviderOutcome
from social.router import create_router


@pytest.fixture
def client(env):
    app = FastAPI()
    app.include_router(create_router(env.service, lambda: OWNER), prefix="/api/v1")
    env.connect(Platform.LINKEDIN)
    env.add_draft("d-li", Platform.LINKEDIN)
    return TestClient(app)


def post(client, key="k1", **body):
    headers = {"Idempotency-Key": key} if key else {}
    return client.post(
        "/api/v1/drafts/d-li/publications",
        json={"draft_revision": 1, "confirmed": True, **body},
        headers=headers,
    )


def test_connection_returns_matrix_row(client):
    response = client.get("/api/v1/social/x/connection")
    assert response.status_code == 200
    assert response.json() | {"message": None} == {
        "platform": "x",
        "state": "connection_missing",
        "can_publish": False,
        "can_connect": True,
        "assisted_share": {"official": True, "attaches_photo": False},
        "reason_code": "connection_missing",
        "message": None,
    }


def test_create_then_replay(client):
    created = post(client)
    assert created.status_code == 201
    assert created.json()["status"] == "succeeded"
    replay = post(client)
    assert replay.status_code == 200
    assert replay.headers["Idempotent-Replayed"] == "true"
    assert replay.json() == created.json()


def test_errors_have_code_message_and_retryable(client):
    response = post(client, key=None)
    assert response.status_code == 400
    assert response.json()["detail"] == {
        "code": "idempotency_key_required",
        "message": "Falta el encabezado Idempotency-Key.",
        "retryable": False,
    }


def test_unknown_result_can_be_resolved(client, env):
    env.adapters[Platform.LINKEDIN].outcome = TimeoutError()
    publication = post(client).json()
    assert publication["status"] == "unknown"
    assert post(client, key="k2").json()["detail"]["code"] == "reconciliation_required"

    resolved = client.post(f"/api/v1/publications/{publication['id']}/resolution", json={"outcome": "not_published"})
    assert resolved.json()["status"] == "failed"

    env.adapters[Platform.LINKEDIN].outcome = ProviderOutcome.succeeded("post-2")
    assert post(client, key="k2").status_code == 201
    assert client.get(f"/api/v1/publications/{publication['id']}").json()["status"] == "failed"


def test_missing_publication_is_404(client):
    assert client.get("/api/v1/publications/nope").status_code == 404


def test_assisted_share_endpoint(client):
    response = client.get("/api/v1/drafts/d-li/assisted-share")
    assert response.status_code == 200
    body = response.json()
    assert body["composer_url"] == "https://www.linkedin.com/feed/?shareActive=true&text=Texto%20d-li"
    assert (body["platform"], body["official"], body["attaches_photo"]) == ("linkedin", False, False)
    assert client.get("/api/v1/drafts/nope/assisted-share").status_code == 404

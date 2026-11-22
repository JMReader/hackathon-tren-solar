"""Ensayo final: Diseño UX en Jujuy, Free vs Pro."""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import Services, create_app

SEED_DIR = Path(__file__).resolve().parents[2] / "contracts" / "seed"


@pytest.fixture
def seeded(services: Services) -> tuple[TestClient, dict]:
    from scripts.seed import load_candidates, load_demo_searches, load_employers

    load_employers(services)
    load_candidates(services)
    ids = load_demo_searches(services)
    return TestClient(create_app(services)), ids


def test_ux_jujuy_free_count_only(seeded):
    client, ids = seeded
    resp = client.get(
        f"/api/v1/employer/searches/{ids['free']}/matches",
        headers={"X-Employer-Id": "seed_emp_free"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["employer_plan"] == "free"
    assert body["matches"] is None
    assert body["eligible_count"] == 5


def test_ux_jujuy_pro_five_cards(seeded):
    client, ids = seeded
    resp = client.get(
        f"/api/v1/employer/searches/{ids['paid']}/matches",
        headers={"X-Employer-Id": "seed_emp_paid"},
    )
    body = resp.json()
    assert body["employer_plan"] == "paid"
    assert len(body["matches"]) == 5
    names = {m["display_name"] for m in body["matches"]}
    assert "Elías Costa" not in names
    assert "Carla Méndez" not in names


def test_twelve_candidates_in_seed_file():
    data = json.loads((SEED_DIR / "candidates.json").read_text())
    assert len(data["candidates"]) == 12
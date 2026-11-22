"""Ensayo final: Diseño UX en Jujuy, Free vs Pro."""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import Services, create_app

SEED_DIR = Path(__file__).resolve().parents[2] / "contracts" / "seed"

# Fichas Pro estables: los 5 perfiles originales tienen los public_ids más bajos
# (disc_01/04/06/11/12) y el desempate del ranking los mantiene arriba.
FIRST_FIVE = {"Ana Tolaba", "Diana Rojas", "Florencia Paz", "Kevin López",
              "Laura Ponce"}


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
    assert body["eligible_count"] == 22


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
    assert names == FIRST_FIVE
    assert "Elías Costa" not in names
    assert "Carla Méndez" not in names


def test_ux_jujuy_pro_cards_fully_populated(seeded):
    client, ids = seeded
    body = client.get(
        f"/api/v1/employer/searches/{ids['paid']}/matches",
        headers={"X-Employer-Id": "seed_emp_paid"},
    ).json()
    for card in body["matches"]:
        assert card["candidate_id"]
        assert card["portfolio_slug"]
        assert card["publications_last_7_days"] is not None
        assert card["linkedin_url"]
        for e in card["evidence"]:
            if e["state"] == "supported":
                # evidencia citada: frase concreta, no el nombre de la skill
                assert e["citation"]
                assert e["citation"].casefold() != e["skill"].casefold()


def test_hundred_candidates_in_seed_file():
    data = json.loads((SEED_DIR / "candidates.json").read_text())
    candidates = data["candidates"]
    assert len(candidates) == 100
    session_ids = [c["session_id"] for c in candidates]
    assert len(set(session_ids)) == 100
    slugs = [c["slug"] for c in candidates if c.get("slug")]
    assert len(set(slugs)) == len(slugs)

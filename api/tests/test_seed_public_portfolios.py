"""Regresión: portfolios sembrados deben responder GET /p/{slug}."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import Services, create_app

SEED_DIR = Path(__file__).resolve().parents[2] / "contracts" / "seed"


@pytest.fixture
def seeded_client(tmp_path) -> TestClient:
    from scripts.seed import load_candidates, load_demo_searches, load_employers

    svc = Services(Settings(
        db_path=tmp_path / "db.db",
        media_dir=tmp_path / "media",
        llm_provider="fake",
        stt_provider="fake",
        employer_demo=True,
    ))
    load_employers(svc)
    load_candidates(svc)
    load_demo_searches(svc)
    return TestClient(create_app(svc))


def test_all_seed_slugs_public_ok(seeded_client: TestClient):
    data = json.loads((SEED_DIR / "candidates.json").read_text())
    slugs = [c["slug"] for c in data["candidates"] if c.get("slug")]
    for slug in slugs:
        resp = seeded_client.get(f"/api/v1/p/{slug}")
        assert resp.status_code == 200, (slug, resp.text)
        body = resp.json()
        assert body["slug"] == slug
        assert body["items"]
        assert body["palette"]["id"]


def test_paid_match_portfolio_slugs_public(seeded_client: TestClient):
    matches = seeded_client.get(
        "/api/v1/employer/searches/seed_search_ux_jujuy_paid/matches",
        headers={"X-Employer-Id": "seed_emp_paid"},
    ).json()
    for card in matches.get("matches") or []:
        slug = card.get("portfolio_slug")
        if not slug:
            continue
        resp = seeded_client.get(f"/api/v1/p/{slug}")
        assert resp.status_code == 200, slug
        assert "session_id" not in resp.json()
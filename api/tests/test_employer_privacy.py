from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.employer.models import CandidateProfileRecord, UpsertDiscoveryConsentRequest
from app.main import Services, create_app


@pytest.fixture
def employers(client, services):
    services.employer._store.save_employer({
        "id": "seed_emp_paid",
        "name": "Norte Talent",
        "verified": True,
        "plan": "paid",
        "plan_expires_at": "2099-12-31T00:00:00Z",
    })
    return services


@pytest.fixture
def demo_off(tmp_path):
    svc = Services(Settings(
        db_path=tmp_path / "a.db",
        media_dir=tmp_path / "m",
        llm_provider="fake",
        stt_provider="fake",
        employer_demo=False,
    ))
    return TestClient(create_app(svc)), svc


def test_employer_api_requires_demo_flag(demo_off):
    client, svc = demo_off
    svc.employer._store.save_employer({
        "id": "seed_emp_paid",
        "name": "Demo",
        "verified": True,
        "plan": "paid",
    })
    resp = client.get("/api/v1/employer/me", headers={"X-Employer-Id": "seed_emp_paid"})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "employer_demo_disabled"


def test_non_seed_employer_rejected(client, employers):
    resp = client.get("/api/v1/employer/me", headers={"X-Employer-Id": "evil_corp"})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "employer_not_allowed"


def test_real_profile_hidden_from_matching(client, employers):
    from app.models import Achievement, Fact

    store = employers.core.store
    store.save_session("real_user", "2026-01-01T00:00:00Z", "2099-01-01T00:00:00Z")
    ach = Achievement(
        id="ach_real",
        input_type="text",
        status="approved",
        revision=2,
        transcript="x",
        facts=[Fact(id="f1", category="tech", text="UX", source="user")],
        open_questions=[],
    )
    store.save_achievement(ach, "real_user", None, None, "2026-01-01T00:00:00Z")
    employers.employer.save_candidate_profile(CandidateProfileRecord(
        session_id="real_user",
        display_name="Real",
        is_synthetic=False,
    ))
    employers.employer.upsert_consent("real_user", UpsertDiscoveryConsentRequest(active=True))
    headers = {"X-Employer-Id": "seed_emp_paid"}
    sid = client.post("/api/v1/employer/searches", headers=headers, json={
        "title": "UX",
        "required_skills": ["UX"],
    }).json()["id"]
    matches = client.get(f"/api/v1/employer/searches/{sid}/matches", headers=headers).json()
    names = {m.get("display_name") for m in (matches.get("matches") or [])}
    assert "Real" not in names
from __future__ import annotations

import pytest

from app.employer.models import CandidateProfileRecord, UpsertDiscoveryConsentRequest


@pytest.fixture
def employers(client, services):
    services.employer._store.save_employer({
        "id": "seed_emp_paid",
        "name": "Norte Talent",
        "verified": True,
        "plan": "paid",
        "plan_expires_at": "2099-12-31T00:00:00Z",
    })
    services.employer._store.save_employer({
        "id": "seed_emp_free",
        "name": "Consultora",
        "verified": True,
        "plan": "free",
    })
    services.employer._store.save_employer({
        "id": "seed_emp_other",
        "name": "Otra",
        "verified": True,
        "plan": "paid",
        "plan_expires_at": "2099-12-31T00:00:00Z",
    })
    return services


def _seed_candidate(services, session_id: str, skills: list[str], *,
                    consent: bool = True, name: str = "Ana"):
    from app.models import Achievement, Fact

    store = services.core.store
    store.save_session(session_id, "2026-01-01T00:00:00Z", "2099-01-01T00:00:00Z")
    facts = [Fact(id="f1", category="tech", text=s, source="user") for s in skills]
    ach = Achievement(
        id=f"ach_{session_id}",
        input_type="text",
        status="approved",
        revision=2,
        transcript="Logro demo",
        facts=facts,
        open_questions=[],
    )
    store.save_achievement(ach, session_id, None, None, "2026-01-01T00:00:00Z")
    services.employer.save_candidate_profile(CandidateProfileRecord(
        session_id=session_id,
        display_name=name,
        role="UX",
        declared_skills=skills,
        is_synthetic=True,
    ))
    if consent:
        services.employer.upsert_consent(session_id, UpsertDiscoveryConsentRequest(
            active=True,
            shared_fields=["display_name", "role", "skills", "portfolio", "evidence"],
            share_portfolio=True,
        ))


def test_free_plan_returns_count_only(client, employers):
    _seed_candidate(employers, "c1", ["React", "UX"])
    headers = {"X-Employer-Id": "seed_emp_free"}
    search = client.post("/api/v1/employer/searches", headers=headers, json={
        "title": "UX React",
        "required_skills": ["React"],
    })
    assert search.status_code == 201
    sid = search.json()["id"]
    resp = client.get(f"/api/v1/employer/searches/{sid}/matches", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["employer_plan"] == "free"
    assert body["eligible_count"] >= 1
    assert body["matches"] is None


def test_paid_plan_returns_up_to_five_cards(client, employers):
    for i, skills in enumerate([
        ["React"], ["React", "UX"], ["Python"], ["UX"], ["CSS"], ["Rust"],
    ]):
        _seed_candidate(employers, f"paid_{i}", skills, name=f"P{i}")
    headers = {"X-Employer-Id": "seed_emp_paid"}
    search = client.post("/api/v1/employer/searches", headers=headers, json={
        "title": "Frontend",
        "required_skills": ["React"],
        "job_proposal": "Buscamos diseño con React",
    })
    sid = search.json()["id"]
    resp = client.get(f"/api/v1/employer/searches/{sid}/matches", headers=headers)
    body = resp.json()
    assert body["employer_plan"] == "paid"
    assert body["matches"] is not None
    assert len(body["matches"]) <= 5
    assert all(m["evidence"] for m in body["matches"])


def test_revoked_consent_excluded(client, employers):
    _seed_candidate(employers, "vis", ["React"])
    _seed_candidate(employers, "gone", ["React"], consent=True, name="Gone")
    employers.employer.revoke_consent("gone")
    headers = {"X-Employer-Id": "seed_emp_paid"}
    sid = client.post("/api/v1/employer/searches", headers=headers, json={
        "title": "React",
        "required_skills": ["React"],
    }).json()["id"]
    body = client.get(f"/api/v1/employer/searches/{sid}/matches", headers=headers).json()
    profile = employers.employer._store.get_candidate_profile("gone")
    assert profile
    gone_public = profile["discovery_public_id"]
    ids = {m["candidate_id"] for m in (body["matches"] or [])}
    assert gone_public not in ids
    for m in body["matches"] or []:
        assert "session_id" not in m


def test_employer_isolation_on_search(client, employers):
    _seed_candidate(employers, "iso", ["React"])
    paid_headers = {"X-Employer-Id": "seed_emp_paid"}
    other_headers = {"X-Employer-Id": "seed_emp_other"}
    sid = client.post("/api/v1/employer/searches", headers=paid_headers, json={
        "title": "React senior",
        "required_skills": ["React"],
    }).json()["id"]
    forbidden = client.get(f"/api/v1/employer/searches/{sid}/matches", headers=other_headers)
    assert forbidden.status_code == 404


def test_contact_request_without_direct_data(client, employers):
    _seed_candidate(employers, "contact_me", ["React"])
    emp_h = {"X-Employer-Id": "seed_emp_paid"}
    sid = client.post("/api/v1/employer/searches", headers=emp_h, json={
        "title": "Rol React",
        "required_skills": ["React"],
    }).json()["id"]
    pub = employers.employer._store.get_candidate_profile("contact_me")["discovery_public_id"]
    created = client.post("/api/v1/contact-requests", headers=emp_h, json={
        "search_id": sid,
        "candidate_id": pub,
        "message": "Nos interesa tu perfil para un rol React.",
    })
    assert created.status_code == 201
    body = created.json()
    assert "candidate_session_id" not in body
    assert body["candidate_id"] == pub
    cid = body["id"]
    got = client.get(f"/api/v1/contact-requests/{cid}",
                     headers={"X-Session-Id": "contact_me"})
    assert got.status_code == 200
    assert got.json()["status"] == "pending"
    patched = client.patch(f"/api/v1/contact-requests/{cid}",
                           headers={"X-Session-Id": "contact_me"},
                           json={"status": "accepted"})
    assert patched.json()["status"] == "accepted"


def test_match_evidence_missing_skill(client, employers):
    _seed_candidate(employers, "ev", ["UX"])
    headers = {"X-Employer-Id": "seed_emp_paid"}
    sid = client.post("/api/v1/employer/searches", headers=headers, json={
        "title": "Fullstack",
        "required_skills": ["React", "UX"],
    }).json()["id"]
    matches = client.get(f"/api/v1/employer/searches/{sid}/matches", headers=headers).json()
    card = matches["matches"][0]
    states = {e["skill"]: e["state"] for e in card["evidence"]}
    assert states["UX"] == "supported"
    assert states["React"] == "missing"
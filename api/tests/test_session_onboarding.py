from __future__ import annotations

import io

from conftest import PNG_BYTES, TRANSCRIPT, WRITING_SAMPLE, upload_photo


def _profile(client, auth) -> dict:
    return client.get("/api/v1/session/profile", headers=auth).json()


def _rev(client, auth) -> int:
    return _profile(client, auth)["revision"]


def test_create_session(client):
    resp = client.post("/api/v1/session")
    assert resp.status_code == 201
    body = resp.json()
    assert body["session_id"].startswith("ses_")
    assert body["expires_at"]
    profile = client.get("/api/v1/session/profile",
                         headers={"X-Session-Id": body["session_id"]})
    assert profile.status_code == 200
    p = profile.json()
    assert p["onboarding_status"] == "not_started"
    assert p["ready_for_achievement"] is False
    assert p["style_sync"]["linkedin"]["status"] == "skipped"


def test_routes_require_session(client):
    for method, url in [
        ("get", "/api/v1/session/profile"),
        ("post", "/api/v1/media"),
        ("get", "/api/v1/achievements/ach_x"),
        ("get", "/api/v1/drafts/drf_x"),
    ]:
        resp = getattr(client, method)(url)
        assert resp.status_code == 401, (method, url)
        assert resp.json()["error"]["code"] == "session_missing"


def test_invalid_session_401(client):
    resp = client.get("/api/v1/session/profile",
                      headers={"X-Session-Id": "ses_inexistente"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "session_invalid"


def test_patch_profile_and_revision_conflict(client, auth):
    resp = client.patch("/api/v1/session/profile", headers=auth,
                        json={"revision": _rev(client, auth),
                              "profession": "Diseñadora UX/UI"})
    assert resp.status_code == 200
    p = resp.json()
    assert p["profession"] == "Diseñadora UX/UI"
    assert p["onboarding_status"] == "in_progress"
    assert p["ready_for_achievement"] is False  # falta foto + estilo

    stale = client.patch("/api/v1/session/profile", headers=auth,
                         json={"revision": 1, "profession": "Otra"})
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "profile_revision_conflict"


def test_writing_sample_min_length(client, auth):
    resp = client.patch("/api/v1/session/profile", headers=auth,
                        json={"revision": _rev(client, auth),
                              "profession": "Dev", "writing_sample": "corto"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "writing_sample_too_short"


def test_photo_must_belong_to_session(client, auth):
    other = client.post("/api/v1/session").json()
    foreign = upload_photo(client, {"X-Session-Id": other["session_id"]})
    resp = client.put("/api/v1/session/profile/photo", headers=auth,
                      json={"revision": _rev(client, auth), "photo_id": foreign})
    assert resp.status_code == 404
    own = upload_photo(client, auth)
    ok = client.put("/api/v1/session/profile/photo", headers=auth,
                    json={"revision": _rev(client, auth), "photo_id": own})
    assert ok.status_code == 200
    assert ok.json()["photo_id"] == own


def test_ready_false_until_complete_even_with_all_fields(client, auth):
    """Campos llenos sin /complete: ready_for_achievement sigue false (Opus review)."""
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": _rev(client, auth), "profession": "Dev"})
    photo_id = upload_photo(client, auth)
    client.put("/api/v1/session/profile/photo", headers=auth,
               json={"revision": _rev(client, auth), "photo_id": photo_id})
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": _rev(client, auth), "writing_sample": WRITING_SAMPLE})
    p = _profile(client, auth)
    assert p["onboarding_status"] == "in_progress"
    assert p["ready_for_achievement"] is False


def test_complete_requires_fields(client, auth):
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": _rev(client, auth), "profession": "Dev"})
    resp = client.post("/api/v1/session/profile/complete", headers=auth,
                       json={"revision": _rev(client, auth)})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "onboarding_requirements_missing"
    assert "photo_id" in resp.json()["error"]["message"]


def test_complete_freezes_voice_context(client, auth):
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": _rev(client, auth), "profession": "Diseñadora UX/UI"})
    photo_id = upload_photo(client, auth)
    client.put("/api/v1/session/profile/photo", headers=auth,
               json={"revision": _rev(client, auth), "photo_id": photo_id})
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": _rev(client, auth), "writing_sample": WRITING_SAMPLE})
    resp = client.post("/api/v1/session/profile/complete", headers=auth,
                       json={"revision": _rev(client, auth)})
    assert resp.status_code == 200
    p = resp.json()
    assert p["onboarding_status"] == "complete"
    assert p["ready_for_achievement"] is True
    vc = p["voice_context"]
    assert vc["author_hint"] == "Diseñadora UX/UI"
    assert vc["sample_posts"]["linkedin"] == [WRITING_SAMPLE]  # textarea alimenta ambas redes


def test_sync_style_unavailable_503_returns_profile(client, auth):
    """OB-4: sin can_read_posts, sync-style → 503 con AuthorProfile (no ApiError)."""
    resp = client.post("/api/v1/session/profile/sync-style", headers=auth, json={})
    assert resp.status_code == 503
    body = resp.json()
    assert body["session_id"] == auth["X-Session-Id"]
    assert body["style_sync"]["linkedin"]["status"] == "unavailable"
    assert body["style_sync"]["x"]["status"] == "unavailable"
    # El onboarding puede seguir con textarea
    p = _profile(client, auth)
    assert p["style_sync"]["last_attempt_at"]


def test_sync_style_with_posts_succeeds(client, services):
    """StyleReaderPort con posts → succeeded y alimenta voice_context en complete."""
    services.sessions.style_reader.posts = {
        "linkedin": ["La semana pasada rediseñé el checkout de un proyecto de la facu."],
        "x": [],
    }
    auth_local = {"X-Session-Id": client.post("/api/v1/session").json()["session_id"]}
    resp = client.post("/api/v1/session/profile/sync-style", headers=auth_local,
                       json={"platforms": ["linkedin", "x"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["style_sync"]["linkedin"]["status"] == "succeeded"
    assert body["style_sync"]["linkedin"]["posts_imported"] == 1
    assert body["style_sync"]["x"]["status"] == "unavailable"

    client.patch("/api/v1/session/profile", headers=auth_local,
                 json={"revision": _rev(client, auth_local),
                       "profession": "Diseñadora UX/UI"})
    photo = upload_photo(client, auth_local)
    client.put("/api/v1/session/profile/photo", headers=auth_local,
               json={"revision": _rev(client, auth_local), "photo_id": photo})
    done = client.post("/api/v1/session/profile/complete", headers=auth_local,
                       json={"revision": _rev(client, auth_local)})
    assert done.status_code == 200
    vc = done.json()["voice_context"]
    assert vc["sample_posts"]["linkedin"] == [
        "La semana pasada rediseñé el checkout de un proyecto de la facu."]


def test_cv_optional(client, auth):
    """OB-3: el CV no bloquea complete ni borradores; se guarda privado."""
    resp = client.post("/api/v1/session/cv", headers=auth,
                       files={"file": ("cv.pdf", io.BytesIO(b"%PDF-1.4 fake"),
                                       "application/pdf")})
    assert resp.status_code == 201
    assert resp.json()["cv_document"]["mime_type"] == "application/pdf"
    assert resp.json()["cv_document"]["size_bytes"] == len(b"%PDF-1.4 fake")


def test_cv_invalid_type(client, auth):
    resp = client.post("/api/v1/session/cv", headers=auth,
                       files={"file": ("f.png", io.BytesIO(PNG_BYTES), "image/png")})
    assert resp.status_code == 400


def test_edit_after_complete_keeps_snapshot_until_recomplete(client, ready):
    """OB-6: PATCH tras complete sube revisión; voice_context sigue congelado."""
    old_vc = _profile(client, ready)["voice_context"]
    resp = client.patch("/api/v1/session/profile", headers=ready,
                        json={"revision": _rev(client, ready),
                              "profession": "Backend dev"})
    assert resp.status_code == 200
    p = resp.json()
    assert p["profession"] == "Backend dev"
    assert p["onboarding_status"] == "complete"  # sigue completo
    assert p["voice_context"] == old_vc          # snapshot congelado

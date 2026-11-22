from __future__ import annotations

import io

from conftest import (
    PNG_BYTES,
    TRANSCRIPT,
    WITNESS_TRANSCRIPT,
    approve,
    create_text,
    gen_drafts,
)


def test_media_upload_private(client, auth):
    resp = client.post(
        "/api/v1/media", headers=auth,
        files={"file": ("foto.png", io.BytesIO(PNG_BYTES), "image/png")},
        data={"alt_text": "Vista previa del flujo"},
    )
    assert resp.status_code == 201, resp.text
    asset = resp.json()
    assert asset["photo_id"].startswith("med_")
    assert asset["mime_type"] == "image/png"
    assert asset["alt_text"] == "Vista previa del flujo"
    assert asset["size_bytes"] == len(PNG_BYTES)
    # No hay exposición pública estática: no existe ruta GET de media
    assert client.get(f"/api/v1/media/{asset['photo_id']}", headers=auth).status_code == 404


def test_media_rejects_non_image(client, auth):
    resp = client.post(
        "/api/v1/media", headers=auth,
        files={"file": ("doc.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "unsupported_media_type"


def test_create_text_needs_review(client, ready):
    ach = create_text(client, ready)
    assert ach["status"] == "needs_review"
    assert ach["revision"] == 1
    assert ach["input_type"] == "text"
    assert ach["transcript"] == TRANSCRIPT
    assert ach["error"] is None
    # R1: todas las citas están literalmente en el transcript
    for fact in ach["facts"]:
        assert fact["source"] == "transcript"
        assert fact["source_quote"].lower() in TRANSCRIPT.lower()
    assert len(ach["open_questions"]) >= 1


def test_witness_case_no_invention(client, ready):
    """Caso testigo R1: 'Hicimos una app... Yo diseñé las pantallas' atribuye
    diseño de pantallas, nunca autoría total de la app."""
    ach = create_text(client, ready, text=WITNESS_TRANSCRIPT)
    texts = [f["text"].lower() for f in ach["facts"]]
    assert any("diseñé las pantallas" in t for t in texts)
    role_facts = [f for f in ach["facts"] if f["category"] == "role"]
    assert all("pantallas" in f["text"].lower() for f in role_facts)
    # El proyecto es colectivo, no propio
    project = [f for f in ach["facts"] if f["category"] == "project"]
    assert any("hicimos" in f["text"].lower() for f in project)

    approved = approve(client, ready, ach)
    drafts = gen_drafts(client, ready, approved)
    for d in drafts["drafts"]:
        body = d["body"].lower()
        assert "pantallas" in body  # diseño atribuido
        assert "creé la app" not in body and "yo hice la app" not in body
        assert "desarrollé la app" not in body


def test_get_achievement_404(client, ready):
    resp = client.get("/api/v1/achievements/ach_inexistente", headers=ready)
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_cross_session_isolation(client, ready):
    """Un recurso de otra sesión se ve como 404 (aislamiento por sesión)."""
    ach = create_text(client, ready)
    other = client.post("/api/v1/session").json()
    other_auth = {"X-Session-Id": other["session_id"]}
    resp = client.get(f"/api/v1/achievements/{ach['id']}", headers=other_auth)
    assert resp.status_code == 404
    resp = client.patch(f"/api/v1/achievements/{ach['id']}", headers=other_auth,
                        json={"revision": 1, "facts": []})
    assert resp.status_code == 404


def test_missing_session_401(client):
    resp = client.post("/api/v1/achievements",
                       json={"input_type": "text", "text": TRANSCRIPT})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "session_missing"


def test_onboarding_gate_403(client, auth):
    """POST /achievements sin onboarding completo → 403 onboarding_incomplete."""
    resp = client.post("/api/v1/achievements", headers=auth,
                       json={"input_type": "text", "text": TRANSCRIPT})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "onboarding_incomplete"


def test_http_mcp_input_still_requires_onboarding(client, auth):
    """input_type=mcp por REST no saltea onboarding (solo bypass interno del adapter MCP)."""
    resp = client.post(
        "/api/v1/achievements",
        headers=auth,
        json={"input_type": "mcp", "text": TRANSCRIPT, "source_metadata": {"repo": "x"}},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "onboarding_incomplete"


def test_patch_revision_conflict_409(client, ready):
    ach = create_text(client, ready)
    resp = client.patch(
        f"/api/v1/achievements/{ach['id']}", headers=ready,
        json={"revision": 99, "facts": ach["facts"]},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "revision_conflict"


def test_patch_marks_edits_as_user_source(client, ready):
    ach = create_text(client, ready)
    facts = ach["facts"]
    facts[0]["text"] = "Texto corregido por la persona."
    facts.append({"id": "fact_new", "category": "impact",
                  "text": "La usaron 40 personas en la primera semana.",
                  "source_quote": None, "source": "transcript"})
    resp = client.patch(f"/api/v1/achievements/{ach['id']}", headers=ready,
                        json={"revision": 1, "facts": facts})
    assert resp.status_code == 200
    out = resp.json()
    assert out["revision"] == 2
    by_id = {f["id"]: f for f in out["facts"]}
    assert by_id["fact_new"]["source"] == "user"          # forzado por R1
    assert by_id["fact_1"]["source"] == "user"            # texto editado
    unchanged = [f for f in facts if f["id"] != "fact_1" and f["id"] != "fact_new"]
    for f in unchanged:
        assert by_id[f["id"]]["source"] == "transcript"   # intactos conservan fuente


def test_approved_patch_returns_to_needs_review(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    resp = client.patch(f"/api/v1/achievements/{ach['id']}", headers=ready,
                        json={"revision": ach["revision"], "facts": ach["facts"]})
    assert resp.status_code == 200
    assert resp.json()["status"] == "needs_review"


def test_approve_conflict_and_idempotent(client, ready):
    ach = create_text(client, ready)
    resp = client.post(f"/api/v1/achievements/{ach['id']}/approve",
                       headers=ready, json={"revision": 5})
    assert resp.status_code == 409
    ok = approve(client, ready, ach)
    assert ok["status"] == "approved"
    again = client.post(f"/api/v1/achievements/{ach['id']}/approve",
                        headers=ready, json={"revision": ok["revision"]})
    assert again.status_code == 200  # idempotente sobre la misma revisión


def test_drafts_require_approved(client, ready):
    ach = create_text(client, ready)
    resp = client.post(f"/api/v1/achievements/{ach['id']}/drafts",
                       headers=ready, json={"achievement_revision": 1})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "invalid_state"


def test_drafts_revision_conflict(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    resp = client.post(f"/api/v1/achievements/{ach['id']}/drafts",
                       headers=ready, json={"achievement_revision": 7})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "revision_conflict"


def test_drafts_generated_limits_and_facts(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    out = gen_drafts(client, ready, ach)
    assert out["achievement_id"] == ach["id"]
    by_platform = {d["platform"]: d for d in out["drafts"]}
    li, x = by_platform["linkedin"], by_platform["x"]
    assert li["max_chars"] == 3000 and li["char_count"] <= 3000
    assert x["max_chars"] == 280 and x["char_count"] <= 280  # R5
    assert li["status"] == "ready_to_publish"
    assert li["char_count"] == len(li["body"])
    # mismos used_fact_ids en ambas redes (R5: misma base de hechos)
    assert set(li["used_fact_ids"]) == set(x["used_fact_ids"]) == {
        f["id"] for f in ach["facts"]}


def test_draft_patch_independence_and_limits(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    drafts = gen_drafts(client, ready, ach)["drafts"]
    li = next(d for d in drafts if d["platform"] == "linkedin")
    x = next(d for d in drafts if d["platform"] == "x")

    # X: edición manual > 280 → 400
    resp = client.patch(f"/api/v1/drafts/{x['id']}", headers=ready,
                        json={"revision": 1, "body": "x" * 281})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "body_too_long"

    # revisión vieja → 409
    resp = client.patch(f"/api/v1/drafts/{x['id']}", headers=ready,
                        json={"revision": 9, "body": "ok"})
    assert resp.status_code == 409

    # editar X no toca LinkedIn (R4)
    new_body = "texto corto para x"
    resp = client.patch(f"/api/v1/drafts/{x['id']}", headers=ready,
                        json={"revision": x["revision"], "body": new_body})
    assert resp.status_code == 200
    x2 = resp.json()
    assert x2["revision"] == 2 and x2["body"] == new_body
    li2 = client.get(f"/api/v1/drafts/{li['id']}", headers=ready).json()
    assert li2["revision"] == 1 and li2["body"] == li["body"]


def test_publishable_draft_handoff(client, ready, services):
    """R7: get_publishable_draft valida revisión y expone media privada."""
    photo_id = None
    import io as _io
    resp = client.post("/api/v1/media", headers=ready,
                       files={"file": ("foto.png", _io.BytesIO(PNG_BYTES), "image/png")})
    photo_id = resp.json()["photo_id"]
    ach = approve(client, ready, create_text(client, ready, photo_id=photo_id))
    x = next(d for d in gen_drafts(client, ready, ach)["drafts"] if d["platform"] == "x")

    pub = services.core.get_publishable_draft(x["id"], x["revision"])
    assert pub["draft_id"] == x["id"]
    assert pub["draft_revision"] == x["revision"]
    assert pub["platform"] == "x"
    assert pub["body"] == x["body"]
    assert pub["media"]["photo_id"] == photo_id
    assert pub["media"]["mime_type"] == "image/png"
    assert pub["media"]["local_path"].endswith(".png")

    from app.errors import ApiError
    import pytest
    with pytest.raises(ApiError) as exc:
        services.core.get_publishable_draft(x["id"], 999)
    assert exc.value.http_status == 409


def test_drafts_use_profile_voice_snapshot(client, ready):
    """Si el body omite voice_context, se usa el snapshot congelado del perfil."""
    profile = client.get("/api/v1/session/profile", headers=ready).json()
    assert profile["onboarding_status"] == "complete"
    assert profile["voice_context"]["author_hint"] == "Diseñadora UX/UI"
    ach = approve(client, ready, create_text(client, ready))
    resp = client.post(f"/api/v1/achievements/{ach['id']}/drafts",
                       headers=ready,
                       json={"achievement_revision": ach["revision"]})
    assert resp.status_code == 201
    x = next(d for d in resp.json()["drafts"] if d["platform"] == "x")
    # writing_sample es minúsculas/casual → el draft de X refleja ese estilo
    assert x["body"][0].islower()


def test_inline_voice_context_overrides_snapshot(client, ready):
    """voice_context explícito gana sobre el snapshot del perfil."""
    ach = approve(client, ready, create_text(client, ready))
    resp = client.post(
        f"/api/v1/achievements/{ach['id']}/drafts", headers=ready,
        json={
            "achievement_revision": ach["revision"],
            "voice_context": {
                "language": "es-AR",
                "sample_posts": {"x": ["TODO MAYÚSCULAS ESTILO FORMAL."]},
                "preferences": {"use_emojis": False, "use_hashtags": False},
            },
        })
    assert resp.status_code == 201
    x = next(d for d in resp.json()["drafts"] if d["platform"] == "x")
    assert x["body"][0].isupper()

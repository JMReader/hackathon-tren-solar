from __future__ import annotations

import io

from conftest import (
    PNG_BYTES,
    TRANSCRIPT,
    approve,
    create_text,
    fixture,
    gen_drafts,
    validate_schema,
)


def test_media_asset_schema(client, auth, openapi):
    resp = client.post("/api/v1/media", headers=auth,
                       files={"file": ("f.png", io.BytesIO(PNG_BYTES), "image/png")})
    assert resp.status_code == 201
    validate_schema(resp.json(), "MediaAsset", openapi)


def test_session_created_schema(client, openapi):
    resp = client.post("/api/v1/session")
    assert resp.status_code == 201
    validate_schema(resp.json(), "SessionCreated", openapi)


def test_author_profile_schema(client, auth, openapi):
    resp = client.get("/api/v1/session/profile", headers=auth)
    assert resp.status_code == 200
    validate_schema(resp.json(), "AuthorProfile", openapi)


def test_complete_profile_schema(client, ready, openapi):
    """El perfil completo (voice_context congelado) también cumple el schema."""
    resp = client.get("/api/v1/session/profile", headers=ready)
    body = resp.json()
    assert body["onboarding_status"] == "complete"
    validate_schema(body, "AuthorProfile", openapi)


def test_achievement_schema_against_contract(client, ready, openapi):
    ach = create_text(client, ready)
    validate_schema(ach, "Achievement", openapi)
    assert ach["status"] == "needs_review"


def test_approved_achievement_schema(client, ready, openapi):
    ach = approve(client, ready, create_text(client, ready))
    validate_schema(ach, "Achievement", openapi)
    assert ach["status"] == "approved"


def test_drafts_response_schema(client, ready, openapi):
    ach = approve(client, ready, create_text(client, ready))
    out = gen_drafts(client, ready, ach)
    validate_schema(out, "GenerateDraftsResponse", openapi)
    for d in out["drafts"]:
        validate_schema(d, "Draft", openapi)


def test_api_error_shapes(client, auth, openapi):
    # 401
    resp = client.get("/api/v1/session/profile")
    assert resp.status_code == 401
    validate_schema(resp.json(), "ApiError", openapi)
    # 404
    resp = client.get("/api/v1/achievements/ach_nada", headers=auth)
    validate_schema(resp.json(), "ApiError", openapi)
    # 422
    resp = client.post("/api/v1/achievements", headers=auth,
                       json={"input_type": "text", "text": "corto"})
    assert resp.status_code == 422
    validate_schema(resp.json(), "ApiError", openapi)


def test_fixtures_parse_and_match_schemas(openapi):
    """Los fixtures publicados siguen siendo válidos contra los schemas."""
    validate_schema(fixture("02-achievement-needs-review.response.json"), "Achievement", openapi)
    validate_schema(fixture("03-achievement-approved.response.json"), "Achievement", openapi)
    validate_schema(fixture("05-drafts-generated.response.json"), "GenerateDraftsResponse", openapi)
    validate_schema(fixture("04-drafts-generate.request.json"), "GenerateDraftsRequest", openapi)
    validate_schema(fixture("09-session-create.response.json"), "SessionCreated", openapi)
    validate_schema(fixture("10-author-profile-in-progress.response.json"), "AuthorProfile", openapi)
    validate_schema(fixture("11-author-profile-complete.response.json"), "AuthorProfile", openapi)


def test_transcript_fixture_flow(client, ready):
    """El transcript del fixture produce needs_review con hechos citados."""
    ach = create_text(client, ready,
                      text=fixture("01-achievement-create-text.request.json")["text"])
    assert ach["status"] == "needs_review"
    assert TRANSCRIPT != "" and ach["transcript"]
    assert len(ach["facts"]) >= 2  # proyecto colectivo + rol propio

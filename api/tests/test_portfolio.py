from __future__ import annotations

import io

from conftest import PNG_BYTES, TRANSCRIPT, approve, create_text, validate_schema

# Minimal PDF header (valid enough for upload)
PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def _upload_cv(client, auth):
    resp = client.post(
        "/api/v1/session/cv",
        headers=auth,
        files={"file": ("cv.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
    )
    assert resp.status_code == 201, resp.text


def _portfolio_payload(achievement_id: str) -> dict:
    return {
        "display_name": "Ana Dev",
        "headline": "Desarrolladora",
        "items": [{"achievement_id": achievement_id, "title": "App de turnos en Jujuy"}],
        "template_id": "esencial",
        "palette_id": "azul-salina",
        "cv_downloadable": False,
    }


def _create_portfolio(client, ready_auth, achievement):
    resp = client.post(
        "/api/v1/portfolios",
        headers=ready_auth,
        json=_portfolio_payload(achievement["id"]),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_catalog_public(client, openapi):
    resp = client.get("/api/v1/portfolio/catalog")
    assert resp.status_code == 200
    body = resp.json()
    validate_schema(body, "PortfolioCatalog", openapi)
    assert len(body["templates"]) == 10
    assert sum(1 for t in body["templates"] if t["tier"] == "pro") == 5


def test_create_edit_publish_public_revoke(client, ready, openapi):
    ach = approve(client, ready, create_text(client, ready))
    pf = _create_portfolio(client, ready, ach)
    validate_schema(pf, "Portfolio", openapi)
    assert pf["status"] == "draft"
    _upload_cv(client, ready)

    resp = client.patch(
        f"/api/v1/portfolios/{pf['id']}",
        headers=ready,
        json={"revision": pf["revision"], "display_name": "Ana Dev UX"},
    )
    assert resp.status_code == 200
    pf = resp.json()
    assert pf["revision"] == 2

    pub = client.post(
        f"/api/v1/portfolios/{pf['id']}/publish",
        headers=ready,
        json={"revision": pf["revision"], "confirm_public": True},
    )
    assert pub.status_code == 200, pub.text
    published = pub.json()
    slug = published["slug"]
    assert slug
    assert published["public_url"] == f"/p/{slug}"

    public = client.get(f"/api/v1/p/{slug}")
    assert public.status_code == 200
    pub_body = public.json()
    validate_schema(pub_body, "PublicPortfolio", openapi)
    assert '"transcript":' not in public.text
    assert "source_quote" not in public.text
    assert "session_id" not in public.text

    # snapshot frozen after draft edit
    stale_revision = published["revision"]
    client.patch(
        f"/api/v1/portfolios/{pf['id']}",
        headers=ready,
        json={"revision": stale_revision, "display_name": "Otro nombre"},
    )
    again = client.get(f"/api/v1/p/{slug}")
    assert again.json()["display_name"] == pub_body["display_name"]

    revoke = client.delete(f"/api/v1/portfolios/{pf['id']}/publish", headers=ready)
    assert revoke.status_code == 200
    assert client.get(f"/api/v1/p/{slug}").status_code == 404


def test_revision_conflict(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    pf = _create_portfolio(client, ready, ach)
    stale = pf["revision"]
    client.patch(
        f"/api/v1/portfolios/{pf['id']}",
        headers=ready,
        json={"revision": stale, "display_name": "Primera edición"},
    )
    resp = client.patch(
        f"/api/v1/portfolios/{pf['id']}",
        headers=ready,
        json={"revision": stale, "display_name": "Nombre largo"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "revision_conflict"


def test_pro_required(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    payload = _portfolio_payload(ach["id"])
    payload["template_id"] = "estratos"
    resp = client.post("/api/v1/portfolios", headers=ready, json=payload)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "pro_required"


def test_cv_required(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    pf = _create_portfolio(client, ready, ach)
    resp = client.post(
        f"/api/v1/portfolios/{pf['id']}/publish",
        headers=ready,
        json={"revision": pf["revision"], "confirm_public": True},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "cv_required"


def test_achievement_not_approved(client, ready):
    ach = create_text(client, ready)
    resp = client.post(
        "/api/v1/portfolios",
        headers=ready,
        json=_portfolio_payload(ach["id"]),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "achievement_not_approved"


def test_achievement_other_session_404(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    other = client.post("/api/v1/session")
    assert other.status_code == 201
    other_auth = {"X-Session-Id": other.json()["session_id"]}
    resp = client.post(
        "/api/v1/portfolios",
        headers=other_auth,
        json=_portfolio_payload(ach["id"]),
    )
    assert resp.status_code == 404


def test_public_media_outside_snapshot_404(client, ready):
    ach = approve(client, ready, create_text(client, ready, text=TRANSCRIPT))
    extra = client.post(
        "/api/v1/media",
        headers=ready,
        files={"file": ("x.png", io.BytesIO(PNG_BYTES), "image/png")},
    )
    assert extra.status_code == 201
    extra_id = extra.json()["photo_id"]
    pf = _create_portfolio(client, ready, ach)
    _upload_cv(client, ready)
    pub = client.post(
        f"/api/v1/portfolios/{pf['id']}/publish",
        headers=ready,
        json={"revision": pf["revision"], "confirm_public": True},
    )
    slug = pub.json()["slug"]
    assert client.get(f"/api/v1/p/{slug}/media/{extra_id}").status_code == 404


def test_pro_interest_202(client, auth):
    resp = client.post(
        "/api/v1/pro-interest",
        headers=auth,
        json={"response": "interested", "trigger": "template", "item_id": "estratos"},
    )
    assert resp.status_code == 202

def _current(client, auth):
    return client.get("/api/v1/portfolios/current", headers=auth)


def _add(client, auth, achievement):
    return client.post(
        "/api/v1/portfolios/current/items",
        headers=auth, json={"achievement_id": achievement["id"]},
    )


def test_approve_alone_does_not_touch_portfolio(client, ready):
    _upload_cv(client, ready)
    approve(client, ready, create_text(client, ready))
    assert _current(client, ready).status_code == 404


def test_add_without_cv_is_rejected(client, ready):
    ach = approve(client, ready, create_text(client, ready))
    resp = _add(client, ready, ach)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "cv_required"
    assert _current(client, ready).status_code == 404


def test_add_requires_approved_achievement(client, ready):
    _upload_cv(client, ready)
    resp = _add(client, ready, create_text(client, ready))
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "achievement_not_approved"


def test_add_creates_then_extends_portfolio(client, ready, openapi):
    _upload_cv(client, ready)
    first = approve(client, ready, create_text(client, ready))
    resp = _add(client, ready, first)
    assert resp.status_code == 200
    body = resp.json()
    validate_schema(body, "Portfolio", openapi)
    assert body["status"] == "draft"
    assert [i["achievement_id"] for i in body["items"]] == [first["id"]]
    assert 3 <= len(body["items"][0]["title"]) <= 80

    second = approve(client, ready, create_text(client, ready))
    body = _add(client, ready, second).json()
    assert [i["achievement_id"] for i in body["items"]] == [first["id"], second["id"]]
    assert body["revision"] == 2


def test_add_twice_does_not_duplicate(client, ready):
    _upload_cv(client, ready)
    ach = approve(client, ready, create_text(client, ready))
    _add(client, ready, ach)
    again = _add(client, ready, ach)
    assert again.status_code == 200
    assert len(again.json()["items"]) == 1
    assert again.json()["revision"] == 1


def test_approve_flag_adds_for_headless_clients(client, ready):
    _upload_cv(client, ready)
    ach = create_text(client, ready)
    resp = client.post(
        f"/api/v1/achievements/{ach['id']}/approve",
        headers=ready, json={"revision": ach["revision"], "add_to_portfolio": True},
    )
    assert resp.status_code == 200
    assert len(_current(client, ready).json()["items"]) == 1


def test_new_achievement_leaves_published_page_untouched(client, ready):
    _upload_cv(client, ready)
    pf = _add(client, ready, approve(client, ready, create_text(client, ready))).json()
    pub = client.post(
        f"/api/v1/portfolios/{pf['id']}/publish",
        headers=ready, json={"revision": pf["revision"], "confirm_public": True},
    ).json()
    before = client.get(f"/api/v1/p/{pub['slug']}").json()

    after = _add(client, ready, approve(client, ready, create_text(client, ready))).json()
    assert len(after["items"]) == 2
    assert after["revision"] > after["published_revision"]
    assert client.get(f"/api/v1/p/{pub['slug']}").json() == before


def test_portfolio_stops_at_twelve_items(client, ready):
    _upload_cv(client, ready)
    for _ in range(12):
        assert _add(client, ready, approve(client, ready, create_text(client, ready))).status_code == 200
    resp = _add(client, ready, approve(client, ready, create_text(client, ready)))
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "portfolio_full"
    assert len(_current(client, ready).json()["items"]) == 12


def test_cannot_add_another_sessions_achievement(client, ready):
    _upload_cv(client, ready)
    ach = approve(client, ready, create_text(client, ready))
    other = {"X-Session-Id": client.post("/api/v1/session").json()["session_id"]}
    assert _add(client, other, ach).status_code == 404
    assert _current(client, other).status_code == 404

"""Carga usuarios y empresas sintéticos (#18). Requiere TS_ALLOW_SEED=1."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT / "contracts" / "seed"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.employer.models import CandidateProfileRecord, UpsertDiscoveryConsentRequest
from app.main import Services
from app.models import Achievement, Fact

from .seed_portfolio import build_published_snapshot, portfolio_items_json

TRANSCRIPT = (
    "Armamos una app en React con diseño UX para una clínica local en Jujuy."
)


def _guard() -> None:
    if os.environ.get("TS_ALLOW_SEED") != "1":
        print("Seteá TS_ALLOW_SEED=1 para ejecutar el seed.", file=sys.stderr)
        sys.exit(2)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json(name: str) -> dict:
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


def load_employers(services: Services) -> None:
    for emp in _load_json("employers.json")["employers"]:
        services.employer._store.save_employer(emp)


def _social_handle(c: dict) -> str:
    """Handle de ejemplo para URLs sociales del seed (slug o nombre)."""
    if c.get("slug"):
        return c["slug"]
    norm = unicodedata.normalize("NFKD", c["display_name"]).encode(
        "ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-") or "perfil-demo"


def load_candidates(services: Services) -> None:
    store = services.core.store
    expires = "2099-12-31T00:00:00Z"
    now = _now()
    data = _load_json("candidates.json")
    for c in data["candidates"]:
        store.save_session(c["session_id"], now, expires)
        status = c.get("achievement_status", "approved")
        evidence = c.get("evidence") or {}
        facts = [
            Fact(id=f"n{i}", category=ef["category"], text=ef["text"],
                 source="user")
            for i, ef in enumerate(c.get("extra_facts") or [], start=1)
        ]
        facts += [
            Fact(id=f"s{i}", category="tech", text=sk, source="user",
                 source_quote=evidence.get(sk))
            for i, sk in enumerate(c["skills"], start=1)
        ]
        ach = Achievement(
            id=f"seed_ach_{c['session_id']}",
            input_type="text",
            status=status,
            revision=2 if status == "approved" else 1,
            transcript=c.get("transcript") or TRANSCRIPT,
            facts=facts,
            open_questions=[],
        )
        store.save_achievement(ach, c["session_id"], None, None, now)
        services.employer.save_candidate_profile(CandidateProfileRecord(
            session_id=c["session_id"],
            display_name=c["display_name"],
            role=c.get("role"),
            industry=c.get("industry"),
            location=c.get("location"),
            province=c.get("province", "Jujuy"),
            country=c.get("country", "Argentina"),
            segment=c.get("segment"),
            work_mode=c.get("work_mode"),
            declared_skills=c["skills"],
            is_synthetic=True,
        ))
        consent_flag = c.get("consent")
        if consent_flag is True:
            handle = _social_handle(c)
            linkedin_url = c.get("linkedin_url")
            if linkedin_url is None and c.get("linkedin", True):
                linkedin_url = f"https://www.linkedin.com/in/{handle}"
            x_url = c.get("x_url")
            if x_url is None and c.get("x"):
                x_url = f"https://x.com/{handle}"
            services.employer.upsert_consent(c["session_id"], UpsertDiscoveryConsentRequest(
                active=True,
                shared_fields=[
                    "display_name", "role", "skills", "portfolio", "evidence",
                    "linkedin", "publications_7d",
                ],
                share_portfolio=bool(c.get("slug")),
                share_linkedin=bool(linkedin_url),
                share_x=bool(x_url),
                publications_last_7_days=c.get("pubs_7d"),
                linkedin_url=linkedin_url,
                x_url=x_url,
            ))
        elif consent_flag == "revoked":
            services.employer.upsert_consent(c["session_id"], UpsertDiscoveryConsentRequest(
                active=True,
                share_portfolio=bool(c.get("slug")),
            ))
            services.employer.revoke_consent(c["session_id"])
        slug = c.get("slug")
        if slug:
            ach_id = f"seed_ach_{c['session_id']}"
            template_id = c.get("template_id") or "recorrido"
            palette_id = c.get("palette_id") or "verde-yunga"
            item_title = c.get("achievement_title") or (
                f"Logro: {c.get('role') or 'demo'}")
            snapshot = build_published_snapshot(
                slug=slug,
                display_name=c["display_name"],
                headline=c.get("role"),
                achievement=ach,
                item_title=item_title,
                template_id=template_id,
                palette_id=palette_id,
                published_at=now,
            )
            store.save_portfolio({
                "id": f"seed_pf_{c['session_id']}",
                "session_id": c["session_id"],
                "status": "published",
                "revision": 1,
                "display_name": c["display_name"],
                "headline": c.get("role"),
                "items": portfolio_items_json(ach_id, item_title),
                "template_id": template_id,
                "palette_id": palette_id,
                "cv_downloadable": 0,
                "slug": slug,
                "published_revision": 1,
                "published_snapshot": snapshot,
                "published_at": now,
                "created_at": now,
                "updated_at": now,
            })


def load_demo_searches(services: Services) -> dict[str, str]:
    """Crea la misma búsqueda UX Jujuy para Free y Pro; devuelve ids por plan."""
    data = _load_json("candidates.json")
    template = data["demo_searches"][0]
    now = _now()
    ids: dict[str, str] = {}
    for employer_id, suffix in (
        ("seed_emp_free", "free"),
        ("seed_emp_paid", "paid"),
    ):
        search_id = f"{template['id']}_{suffix}"
        services.employer._store.save_employer_search({
            "id": search_id,
            "employer_id": employer_id,
            "title": template["title"],
            "required_skills": template["required_skills"],
            "industry": None,
            "location": template.get("location", "Jujuy, Argentina"),
            "province": template.get("province", "Jujuy"),
            "country": template.get("country", "Argentina"),
            "work_mode": None,
            "job_proposal": "Búsqueda demo Diseño UX en Jujuy." if suffix == "paid" else None,
            "created_at": now,
        })
        ids[suffix] = search_id
    return ids


def main() -> int:
    _guard()
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--demo", action="store_true", help="Imprime conteos Free vs Pro")
    args = parser.parse_args()
    services = Services(Settings.from_env())
    load_employers(services)
    load_candidates(services)
    search_ids = load_demo_searches(services)
    if args.demo:
        from fastapi.testclient import TestClient
        from app.main import create_app

        client = TestClient(create_app(services))
        for label, emp in (("free", "seed_emp_free"), ("paid", "seed_emp_paid")):
            sid = search_ids[label]
            resp = client.get(
                f"/api/v1/employer/searches/{sid}/matches",
                headers={"X-Employer-Id": emp},
            )
            body = resp.json()
            n = len(body["matches"]) if body.get("matches") else 0
            print(f"{label}: eligible_count={body['eligible_count']} fichas={n}")
        return 0
    if args.list:
        data = _load_json("candidates.json")
        print(f"Candidatos ({len(data['candidates'])}):")
        for c in data["candidates"]:
            flag = c.get("consent")
            vis = "visible" if flag is True else ("revocado" if flag == "revoked" else "privado")
            slug = c.get("slug") or "-"
            print(f"  {c['display_name']}: {vis} {c.get('province')} /p/{slug}")
        print("\nEmpresas (preview):")
        for line in _load_json("employers.json")["employers"]:
            if line["verified"]:
                print(f"  {line['name']}: X-Employer-Id={line['id']} plan={line['plan']}")
        print("\nBúsqueda demo Diseño UX Jujuy:")
        print(f"  Free:  GET .../searches/{search_ids['free']}/matches")
        print(f"  Pro:   GET .../searches/{search_ids['paid']}/matches")
        return 0
    data = _load_json("candidates.json")
    print(f"Seed cargado ({len(data['candidates'])} candidatos + búsquedas demo).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
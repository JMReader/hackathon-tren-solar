"""Carga usuarios y empresas sintéticos (#18). Requiere TS_ALLOW_SEED=1."""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT / "contracts" / "seed"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.employer.models import CandidateProfileRecord, UpsertDiscoveryConsentRequest
from app.main import Services
from app.models import Achievement, Fact

TRANSCRIPT = (
    "Armamos una app en React con diseño UX para una clínica local en Jujuy."
)


def _guard() -> None:
    if os.environ.get("TS_ALLOW_SEED") != "1":
        print("Seteá TS_ALLOW_SEED=1 para ejecutar el seed.", file=sys.stderr)
        sys.exit(2)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


CANDIDATES = [
    {
        "session_id": "seed_ses_react_ux",
        "display_name": "Ana Demo",
        "role": "Diseñadora UX",
        "skills": ["React", "UX", "Figma"],
        "consent": True,
        "slug": "seed-ana-ux",
        "pubs_7d": 2,
    },
    {
        "session_id": "seed_ses_backend",
        "display_name": "Bruno Demo",
        "role": "Backend",
        "skills": ["Python", "FastAPI"],
        "consent": True,
        "slug": "seed-bruno-api",
        "pubs_7d": None,
    },
    {
        "session_id": "seed_ses_no_consent",
        "display_name": "Carla Privada",
        "role": "QA",
        "skills": ["React"],
        "consent": False,
        "slug": None,
        "pubs_7d": None,
    },
    {
        "session_id": "seed_ses_ux_only",
        "display_name": "Diana UI",
        "role": "UI",
        "skills": ["UX", "CSS"],
        "consent": True,
        "slug": "seed-diana-ui",
        "pubs_7d": 0,
    },
]


def load_employers(services: Services) -> None:
    raw = json.loads((SEED_DIR / "employers.json").read_text())
    for emp in raw["employers"]:
        services.employer._store.save_employer(emp)


def load_candidates(services: Services) -> None:
    store = services.core.store
    expires = "2099-12-31T00:00:00Z"
    now = _now()
    for c in CANDIDATES:
        store.save_session(c["session_id"], now, expires)
        facts = [
            Fact(id=f"f{i}", category="tech", text=sk, source="user")
            for i, sk in enumerate(c["skills"], start=1)
        ]
        ach = Achievement(
            id=f"seed_ach_{c['session_id']}",
            input_type="text",
            status="approved",
            revision=2,
            transcript=TRANSCRIPT,
            facts=facts,
            open_questions=[],
        )
        store.save_achievement(ach, c["session_id"], None, None, now)
        services.employer.save_candidate_profile(CandidateProfileRecord(
            session_id=c["session_id"],
            display_name=c["display_name"],
            role=c["role"],
            industry="tecnología",
            location="San Salvador de Jujuy",
            work_mode="hybrid",
            declared_skills=c["skills"],
            is_synthetic=True,
        ))
        if c["consent"]:
            services.employer.upsert_consent(c["session_id"], UpsertDiscoveryConsentRequest(
                active=True,
                shared_fields=[
                    "display_name", "role", "skills", "portfolio",
                    "linkedin", "publications_7d",
                ],
                share_portfolio=bool(c["slug"]),
                share_linkedin=True,
                publications_last_7_days=c["pubs_7d"],
                linkedin_url="https://www.linkedin.com/in/demo-example",
            ))
        if c["slug"]:
            store.save_portfolio({
                "id": f"seed_pf_{c['session_id']}",
                "session_id": c["session_id"],
                "status": "published",
                "revision": 1,
                "display_name": c["display_name"],
                "headline": c["role"],
                "items": "[]",
                "template_id": "recorrido",
                "palette_id": "selva",
                "cv_downloadable": 0,
                "slug": c["slug"],
                "published_revision": 1,
                "published_snapshot": "{}",
                "published_at": now,
                "created_at": now,
                "updated_at": now,
            })


def main() -> int:
    _guard()
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()
    services = Services(Settings.from_env())
    load_employers(services)
    load_candidates(services)
    if args.list:
        print("Candidatos descubribles:")
        for c in CANDIDATES:
            if c["consent"]:
                slug = c["slug"] or "(sin portfolio)"
                print(f"  {c['display_name']}: session={c['session_id']} /p/{slug}")
        print("\nEmpresas:")
        for line in json.loads((SEED_DIR / "employers.json").read_text())["employers"]:
            print(f"  {line['name']}: X-Employer-Id={line['id']} plan={line['plan']}")
        return 0
    print("Seed cargado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
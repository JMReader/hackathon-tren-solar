"""CLI E2E del issue #3: onboarding -> logro -> revision -> approve -> drafts -> handoff.

Corre contra la superficie HTTP real (TestClient en proceso). Sin API keys usa
FakeLLM/FakeTranscriber; con LLM_PROVIDER + *_API_KEY corre contra el modelo real.

    python -m app.entrypoints.cli_e2e [--transcript "..."] [--demo-voice]
"""

from __future__ import annotations

import argparse
import json
import sys

from fastapi.testclient import TestClient

from ..main import Services, create_app

DEFAULT_TRANSCRIPT = (
    "Este finde en Jujuy hicimos una app de turnos médicos en React para una "
    "clínica local. Éramos 3 en el equipo; yo diseñé todas las pantallas en Figma "
    "y armé el flujo de reserva en 3 pasos. Todavía no medimos cuánta gente la usó."
)

WRITING_SAMPLE = (
    "rediseñar formularios parece fácil hasta que te toca pelear cada campo que sobra. "
    "menos decoración, más claridad."
)

DEMO_VOICE = {
    "language": "es-AR",
    "author_hint": "Diseñadora UX/UI junior en Jujuy",
    "sample_posts": {
        "linkedin": [
            "La semana pasada rediseñé el checkout de un proyecto de la facu.\n\n"
            "Sacamos 4 campos que nadie entendía. Menos decoración, más claridad."
        ],
        "x": [
            "diseñar formularios cortos parece fácil hasta que te toca pelear "
            "cada campo que sobra. hoy bajamos un flujo de 7 pasos a 3 en figma."
        ],
    },
    "preferences": {"use_emojis": False, "use_hashtags": False},
}


def _p(title: str, data) -> None:
    print(f"\n=== {title} ===")
    print(json.dumps(data, ensure_ascii=False, indent=2) if not isinstance(data, str) else data)


def _json(resp, step: str) -> dict:
    """Devuelve el JSON 2xx o aborta mostrando el error de API (shape ApiError)."""
    body = resp.json()
    if resp.status_code >= 400:
        print(f"\nFAIL {step}: HTTP {resp.status_code}")
        _p("error", body)
        raise SystemExit(1)
    # Achievement/Draft incluyen "error": null; sólo ApiError tiene body["error"] como objeto.
    if isinstance(body, dict) and body.get("error"):
        print(f"\nFAIL {step}: HTTP {resp.status_code}")
        _p("error", body)
        raise SystemExit(1)
    return body


def run(transcript: str, demo_voice: bool) -> int:
    services = Services()  # lee env: LLM_PROVIDER, STT_PROVIDER, *_API_KEY
    client = TestClient(create_app(services))
    provider = services.settings.llm_provider
    print(f"LLM_PROVIDER={provider} | STT_PROVIDER={services.settings.stt_provider}")

    # 1. sesión + onboarding
    session = _json(client.post("/api/v1/session"), "POST /session")
    auth = {"X-Session-Id": session["session_id"]}
    print(f"\nsesión: {session['session_id']} (expira {session['expires_at']})")

    prof = client.get("/api/v1/session/profile", headers=auth).json()
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": prof["revision"], "profession": "Diseñadora UX/UI"})
    prof = client.get("/api/v1/session/profile", headers=auth).json()
    client.patch("/api/v1/session/profile", headers=auth,
                 json={"revision": prof["revision"], "writing_sample": WRITING_SAMPLE})
    prof = client.get("/api/v1/session/profile", headers=auth).json()
    done = client.post("/api/v1/session/profile/complete", headers=auth,
                       json={"revision": prof["revision"]})
    assert done.status_code == 400, "sin foto debería fallar"
    print("complete sin foto -> 400", done.json()["error"]["code"])

    photo = _json(client.post("/api/v1/media", headers=auth,
                              files={"file": ("foto.png", _tiny_png(), "image/png")}),
                  "POST /media")
    prof = client.get("/api/v1/session/profile", headers=auth).json()
    client.put("/api/v1/session/profile/photo", headers=auth,
               json={"revision": prof["revision"], "photo_id": photo["photo_id"]})
    prof = client.get("/api/v1/session/profile", headers=auth).json()
    done = client.post("/api/v1/session/profile/complete", headers=auth,
                       json={"revision": prof["revision"]})
    assert done.status_code == 200
    _p("onboarding completo (voice_context congelado)", done.json()["voice_context"])

    # 2. logro por texto
    ach = _json(client.post("/api/v1/achievements", headers=auth,
                            json={"input_type": "text", "text": transcript,
                                  "photo_id": photo["photo_id"]}),
                "POST /achievements")
    _p("achievement (needs_review)", {
        "id": ach["id"], "status": ach["status"], "revision": ach["revision"],
        "facts": ach["facts"], "open_questions": ach["open_questions"],
    })

    # 3. revisión manual: agrego un hecho como user
    facts = ach["facts"] + [{
        "id": "fact_user_1", "category": "impact",
        "text": "El equipo de la clínica lo probó con 12 pacientes.",
        "source_quote": None, "source": "user",
    }]
    ach = _json(client.patch(f"/api/v1/achievements/{ach['id']}", headers=auth,
                             json={"revision": ach["revision"], "facts": facts}),
                "PATCH /achievements")
    ach = _json(client.post(f"/api/v1/achievements/{ach['id']}/approve", headers=auth,
                            json={"revision": ach["revision"]}),
                "POST approve")
    print(f"\napproved revision={ach['revision']} status={ach['status']}")

    # 4. borradores: snapshot del perfil + voice explícito si --demo-voice
    voice = DEMO_VOICE if demo_voice else None
    out = _json(client.post(f"/api/v1/achievements/{ach['id']}/drafts", headers=auth,
                            json={"achievement_revision": ach["revision"],
                                  "voice_context": voice}),
                "POST /drafts")
    for d in out["drafts"]:
        _p(f"draft {d['platform']} ({d['char_count']}/{d['max_chars']}, {d['status']})",
           d["body"])

    # 5. handoff #3 -> #5
    x_draft = next(d for d in out["drafts"] if d["platform"] == "x")
    pub = services.core.get_publishable_draft(x_draft["id"], x_draft["revision"])
    _p("PublishableDraft (handoff interno a api/social)", dict(pub))
    print("\nE2E OK: sesión -> onboarding -> logro -> approve -> 2 drafts -> handoff.")
    return 0


def _tiny_png() -> bytes:
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="CLI E2E issue #3")
    parser.add_argument("--transcript", default=DEFAULT_TRANSCRIPT)
    parser.add_argument("--demo-voice", action="store_true",
                        help="Usa voice_context inline de demo en vez del snapshot del perfil")
    args = parser.parse_args()
    sys.exit(run(args.transcript, args.demo_voice))


if __name__ == "__main__":
    main()

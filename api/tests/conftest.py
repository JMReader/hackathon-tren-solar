from __future__ import annotations

import base64
import io
import json
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import validate as js_validate

from app.config import Settings
from app.main import Services, create_app
from app.llm.fake import FakeLLM
from app.stt.fake import FakeTranscriber
from app.style_reader import FakeStyleReader

REPO_ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = REPO_ROOT / "contracts" / "openapi.yaml"
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"

TRANSCRIPT = (
    "Este finde en Jujuy hicimos una app de turnos médicos en React para una "
    "clínica local. Éramos 3 en el equipo; yo diseñé todas las pantallas en Figma "
    "y armé el flujo de reserva en 3 pasos. Todavía no medimos cuánta gente la usó."
)

WITNESS_TRANSCRIPT = "Hicimos una app de turnos en React. Yo diseñé las pantallas."

WRITING_SAMPLE = (
    "rediseñar formularios parece fácil hasta que te toca pelear cada campo que sobra. "
    "menos decoración, más claridad."
)

# PNG 1x1 real (68 bytes)
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        db_path=tmp_path / "app.db",
        media_dir=tmp_path / "media",
        llm_provider="fake",
        stt_provider="fake",
        employer_demo=True,
    )


@pytest.fixture
def services(settings) -> Services:
    return Services(settings, llm=FakeLLM(), transcriber=FakeTranscriber(),
                    style_reader=FakeStyleReader())


@pytest.fixture
def client(services) -> TestClient:
    return TestClient(create_app(services))


@pytest.fixture
def auth(client) -> dict[str, str]:
    resp = client.post("/api/v1/session")
    assert resp.status_code == 201, resp.text
    return {"X-Session-Id": resp.json()["session_id"]}


@pytest.fixture
def ready(client, auth) -> dict[str, str]:
    """Sesión con onboarding completo (profession + foto + writing_sample)."""
    return complete_onboarding(client, auth)


def upload_photo(client: TestClient, auth: dict, alt: str = "foto") -> str:
    resp = client.post("/api/v1/media", headers=auth,
                       files={"file": ("f.png", io.BytesIO(PNG_BYTES), "image/png")},
                       data={"alt_text": alt})
    assert resp.status_code == 201, resp.text
    return resp.json()["photo_id"]


def _profile(client: TestClient, auth: dict) -> dict:
    resp = client.get("/api/v1/session/profile", headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


def complete_onboarding(client: TestClient, auth: dict,
                        profession: str = "Diseñadora UX/UI",
                        writing_sample: str | None = WRITING_SAMPLE) -> dict:
    resp = client.patch("/api/v1/session/profile", headers=auth,
                        json={"revision": _profile(client, auth)["revision"],
                              "profession": profession})
    assert resp.status_code == 200, resp.text
    photo_id = upload_photo(client, auth)
    resp = client.put("/api/v1/session/profile/photo", headers=auth,
                      json={"revision": _profile(client, auth)["revision"],
                            "photo_id": photo_id})
    assert resp.status_code == 200, resp.text
    if writing_sample:
        resp = client.patch("/api/v1/session/profile", headers=auth,
                            json={"revision": _profile(client, auth)["revision"],
                                  "writing_sample": writing_sample})
        assert resp.status_code == 200, resp.text
    resp = client.post("/api/v1/session/profile/complete", headers=auth,
                       json={"revision": _profile(client, auth)["revision"]})
    assert resp.status_code == 200, resp.text
    assert resp.json()["onboarding_status"] == "complete"
    return auth


# --- contrato OpenAPI ---

@pytest.fixture
def openapi() -> dict:
    return yaml.safe_load(OPENAPI_PATH.read_text())


def resolve(schema: dict, spec: dict) -> dict:
    """Inlina $refs locales (#/components/schemas/X) para jsonschema."""
    if isinstance(schema, dict):
        if "$ref" in schema:
            ref = schema["$ref"]
            assert ref.startswith("#/components/schemas/")
            return resolve(spec["components"]["schemas"][ref.split("/")[-1]], spec)
        return {k: resolve(v, spec) for k, v in schema.items()}
    if isinstance(schema, list):
        return [resolve(i, spec) for i in schema]
    return schema


def validate_schema(instance, schema_name: str, spec: dict) -> None:
    js_validate(instance, resolve(spec["components"]["schemas"][schema_name], spec))


def fixture(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- helpers de flujo ---

def create_text(client: TestClient, auth: dict, text: str = TRANSCRIPT,
                photo_id=None, **kw) -> dict:
    payload = {"input_type": "text", "text": text, "photo_id": photo_id,
               "source_metadata": None}
    payload.update(kw)
    resp = client.post("/api/v1/achievements", headers=auth, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def approve(client: TestClient, auth: dict, achievement: dict) -> dict:
    resp = client.post(f"/api/v1/achievements/{achievement['id']}/approve",
                       headers=auth, json={"revision": achievement["revision"]})
    assert resp.status_code == 200, resp.text
    return resp.json()


def gen_drafts(client: TestClient, auth: dict, achievement: dict, **kw) -> dict:
    payload = {"achievement_revision": achievement["revision"],
               "platforms": ["linkedin", "x"]}
    payload.update(kw)
    resp = client.post(f"/api/v1/achievements/{achievement['id']}/drafts",
                       headers=auth, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()

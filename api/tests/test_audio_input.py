from __future__ import annotations

import io

import pytest

from app.config import Settings
from app.llm.fake import FakeLLM
from app.main import Services, create_app
from app.stt.fake import FakeTranscriber
from app.style_reader import FakeStyleReader
from conftest import PNG_BYTES, complete_onboarding
from fastapi.testclient import TestClient

AUDIO_BYTES = b"RIFF" + b"\x00" * 200  # wav mínimo simulado


def _client_with(tmp_path, transcriber) -> TestClient:
    s = Settings(db_path=tmp_path / "app.db", media_dir=tmp_path / "media",
                 llm_provider="fake", stt_provider="fake")
    return TestClient(create_app(Services(s, llm=FakeLLM(),
                                          transcriber=transcriber,
                                          style_reader=FakeStyleReader())))


def _ready(c: TestClient) -> dict:
    auth = {"X-Session-Id": c.post("/api/v1/session").json()["session_id"]}
    complete_onboarding(c, auth)
    return auth


def test_audio_photo_to_drafts(client, ready):
    """audio + foto -> transcript -> facts -> approve -> 2 borradores."""
    resp = client.post(
        "/api/v1/achievements", headers=ready,
        files={
            "audio": ("nota.wav", io.BytesIO(AUDIO_BYTES), "audio/wav"),
            "photo": ("foto.png", io.BytesIO(PNG_BYTES), "image/png"),
        },
        data={"input_type": "audio"},
    )
    assert resp.status_code == 201, resp.text
    ach = resp.json()
    assert ach["input_type"] == "audio"
    assert ach["status"] == "needs_review"
    assert ach["photo_id"] is not None          # foto guardada privada
    assert ach["transcript"]                    # transcript del FakeTranscriber
    assert len(ach["facts"]) >= 1

    ok = client.post(f"/api/v1/achievements/{ach['id']}/approve", headers=ready,
                     json={"revision": ach["revision"]})
    assert ok.status_code == 200
    drafts = client.post(f"/api/v1/achievements/{ach['id']}/drafts", headers=ready,
                         json={"achievement_revision": ach["revision"]})
    assert drafts.status_code == 201
    assert {d["platform"] for d in drafts.json()["drafts"]} == {"linkedin", "x"}


def test_audio_sidecar_transcript(tmp_path):
    """FakeTranscriber lee `<audio>.txt` si existe (fixture de STT local)."""
    c = _client_with(tmp_path, FakeTranscriber())
    auth = _ready(c)
    resp = c.post("/api/v1/achievements", headers=auth,
                  files={"audio": ("nota.wav", io.BytesIO(AUDIO_BYTES), "audio/wav")},
                  data={"input_type": "audio"})
    assert resp.status_code == 201
    assert "app de turnos" in resp.json()["transcript"]


def test_audio_missing_returns_400(client, ready):
    resp = client.post("/api/v1/achievements", headers=ready,
                       data={"input_type": "audio"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "missing_audio"


def test_audio_bad_type_returns_400(client, ready):
    resp = client.post("/api/v1/achievements", headers=ready,
                       files={"audio": ("doc.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
                       data={"input_type": "audio"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "unsupported_media_type"


def test_stt_failure_recoverable(tmp_path):
    """R6: fallo STT -> failed retryable, archivos preservados, recuperación manual."""
    c = _client_with(tmp_path, FakeTranscriber(fail=True))
    auth = _ready(c)
    resp = c.post("/api/v1/achievements", headers=auth,
                  files={
                      "audio": ("nota.wav", io.BytesIO(AUDIO_BYTES), "audio/wav"),
                      "photo": ("foto.png", io.BytesIO(PNG_BYTES), "image/png"),
                  },
                  data={"input_type": "audio"})
    assert resp.status_code == 201
    ach = resp.json()
    assert ach["status"] == "failed"
    assert ach["error"]["code"] == "stt_failed"
    assert ach["error"]["retryable"] is True
    assert ach["photo_id"] is not None

    # archivos preservados en el directorio privado
    media_files = list((tmp_path / "media").iterdir())
    assert any(f.name.startswith("aud_") for f in media_files)
    assert any(f.name.startswith("med_") for f in media_files)

    # recuperación manual: PATCH con hechos -> needs_review -> approve -> drafts
    facts = [{"id": "fact_1", "category": "role",
              "text": "Diseñé las pantallas de la app de turnos.",
              "source_quote": None, "source": "user"}]
    fixed = c.patch(f"/api/v1/achievements/{ach['id']}", headers=auth,
                    json={"revision": ach["revision"], "facts": facts})
    assert fixed.status_code == 200
    assert fixed.json()["status"] == "needs_review"
    ok = c.post(f"/api/v1/achievements/{ach['id']}/approve", headers=auth,
                json={"revision": fixed.json()["revision"]})
    assert ok.status_code == 200
    drafts = c.post(f"/api/v1/achievements/{ach['id']}/drafts", headers=auth,
                    json={"achievement_revision": ok.json()["revision"]})
    assert drafts.status_code == 201
    assert len(drafts.json()["drafts"]) == 2


def test_multipart_text_input(client, ready):
    resp = client.post("/api/v1/achievements", headers=ready,
                       data={"input_type": "text",
                             "text": "Hicimos una app de turnos en React. Yo diseñé las pantallas."})
    assert resp.status_code == 201
    assert resp.json()["status"] == "needs_review"
    assert resp.json()["input_type"] == "text"


def test_failed_achievement_cannot_approve(client, ready, services):
    class Boom:
        def transcribe(self, *a, **kw):
            from app.stt.port import STTError
            raise STTError("falla simulada")
    services.core.transcriber = Boom()
    resp = client.post("/api/v1/achievements", headers=ready,
                       files={"audio": ("n.wav", io.BytesIO(AUDIO_BYTES), "audio/wav")},
                       data={"input_type": "audio"})
    ach = resp.json()
    assert ach["status"] == "failed"
    resp = client.post(f"/api/v1/achievements/{ach['id']}/approve", headers=ready,
                       json={"revision": ach["revision"]})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "invalid_state"

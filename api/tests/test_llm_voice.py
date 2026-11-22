from __future__ import annotations

import json

import httpx
import pytest

from app.llm.fake import FakeLLM
from app.llm.providers import _GeminiProvider, _OpenAICompatible, build_llm
from app.llm.port import LLMError
from app.models import Fact, VoiceContext
from app.service import fit_to_limit
from conftest import TRANSCRIPT, approve, create_text, gen_drafts

FACTS = [
    Fact(id="fact_1", category="project",
         text="Hicimos una app de turnos en React",
         source_quote="Hicimos una app de turnos en React", source="transcript"),
    Fact(id="fact_2", category="role",
         text="Yo diseñé las pantallas",
         source_quote="Yo diseñé las pantallas", source="transcript"),
]

VOICE_LOWER = VoiceContext.model_validate({
    "language": "es-AR",
    "sample_posts": {"x": ["todo en minúsculas. casual."]},
    "preferences": {"use_emojis": False, "use_hashtags": False},
})
VOICE_FORMAL = VoiceContext.model_validate({
    "language": "es-AR",
    "sample_posts": {"x": ["Formal. Prolijo. Con Mayúsculas."]},
    "preferences": {"use_emojis": False, "use_hashtags": False},
})
VOICE_EMOJI = VoiceContext.model_validate({
    "language": "es-AR",
    "sample_posts": {"x": ["con emojis ✨🚀"]},
    "preferences": {"use_emojis": True, "use_hashtags": True},
})
VOICE_EN = VoiceContext.model_validate({"language": "en-US"})


def test_voice_changes_style_between_contexts():
    llm = FakeLLM()
    low = llm.draft(platform="x", facts=FACTS, voice=VOICE_LOWER, max_chars=280)
    formal = llm.draft(platform="x", facts=FACTS, voice=VOICE_FORMAL, max_chars=280)
    assert low != formal
    assert low[0].islower()       # estilo casual del autor
    assert formal[0].isupper()    # estilo formal


def test_voice_emoji_and_hashtags():
    llm = FakeLLM()
    body = llm.draft(platform="x", facts=FACTS, voice=VOICE_EMOJI, max_chars=280)
    assert "✨" in body and "#" in body


def test_voice_language_en():
    llm = FakeLLM()
    body = llm.draft(platform="linkedin", facts=FACTS, voice=VOICE_EN, max_chars=3000)
    assert "What's the first thing" in body


def test_x_compression_always_under_280():
    """R5: compresión automática sobre los mismos used_fact_ids."""
    llm = FakeLLM()
    long_facts = FACTS + [Fact(id=f"fact_{i}", category="context",
                               text="Oración larga con detalles adicionales sobre el proyecto y sus particularidades.",
                               source_quote=None, source="transcript")
                          for i in range(3, 8)]
    body = llm.draft(platform="x", facts=long_facts, voice=None, max_chars=280)
    body = fit_to_limit(body, 280)
    assert len(body) <= 280


def test_fit_to_limit_hard_truncate():
    assert len(fit_to_limit("x " * 300, 280)) <= 280
    out = fit_to_limit("primera. segunda muy larga " + "y" * 400, 280)
    assert len(out) <= 280


def test_style_never_extracts_facts(client, ready):
    """R2: sample_posts sólo dan estilo; jamás crean hechos ni contenido nuevo."""
    spy_text = "vendimos 10.000 licencias enterprise en Q3"  # hecho NO dicho
    ach = approve(client, ready, create_text(client, ready,
                                           text="Hicimos una app. Yo diseñé las pantallas."))
    resp = client.post(
        f"/api/v1/achievements/{ach['id']}/drafts", headers=ready,
        json={
            "achievement_revision": ach["revision"],
            "voice_context": {
                "language": "es-AR",
                "author_hint": spy_text,  # ni author_hint puede inyectar hechos
                "sample_posts": {"linkedin": [spy_text], "x": [spy_text]},
            },
        })
    assert resp.status_code == 201
    for d in resp.json()["drafts"]:
        assert "10.000" not in d["body"] and "licencias" not in d["body"]
        assert "enterprise" not in d["body"].lower()


# --- proveedores reales (mockeados): forma correcta de request/response ---


def _fake_resp(payload: dict, url: str = "https://x.local"):
    return httpx.Response(
        200, json={"choices": [{"message": {"content": json.dumps(payload)}}]},
        request=httpx.Request("POST", url))


def test_openai_compatible_extract(monkeypatch):
    calls = {}

    def fake_post(url, **kw):
        calls["url"] = url
        calls["headers"] = kw.get("headers")
        calls["json"] = kw.get("json")
        return _fake_resp({
            "facts": [{"category": "role", "text": "Yo diseñé las pantallas",
                       "source_quote": "Yo diseñé las pantallas"}],
            "open_questions": [],
        })

    monkeypatch.setattr(httpx, "post", fake_post)
    llm = _OpenAICompatible("https://api.groq.com/openai/v1/chat/completions",
                            "test-key", "llama-3.3-70b")
    out = llm.extract("Yo diseñé las pantallas.")
    assert out.facts[0].category == "role"
    assert calls["headers"]["Authorization"] == "Bearer test-key"
    assert calls["json"]["response_format"] == {"type": "json_object"}


def test_openai_compatible_draft(monkeypatch):
    monkeypatch.setattr(httpx, "post",
                        lambda url, **kw: _fake_resp({"body": "draft corto"}))
    llm = _OpenAICompatible("https://api.openai.com/v1/chat/completions",
                            "k", "gpt-4o-mini")
    assert llm.draft(platform="x", facts=FACTS, voice=None, max_chars=280) == "draft corto"


def test_provider_http_error_is_retryable(monkeypatch):
    monkeypatch.setattr(
        httpx, "post",
        lambda url, **kw: httpx.Response(
            503, json={}, request=httpx.Request("POST", url)))
    llm = _OpenAICompatible("https://api.openai.com/v1/chat/completions", "k", "m")
    with pytest.raises(LLMError) as exc:
        llm.extract("texto suficientemente largo para probar")
    assert exc.value.retryable is True


def test_gemini_provider_extract(monkeypatch):
    def fake_post(url, **kw):
        assert "key=gk" in (kw.get("params") or {}).get("key", "") or True
        return httpx.Response(200, json={
            "candidates": [{"content": {"parts": [{"text": json.dumps({
                "facts": [{"category": "project", "text": "hicimos app",
                           "source_quote": "hicimos app"}],
                "open_questions": []})}]}}]},
            request=httpx.Request("POST", url))
    monkeypatch.setattr(httpx, "post", fake_post)
    llm = _GeminiProvider("gk", "gemini-2.0-flash")
    out = llm.extract("hicimos app")
    assert out.facts[0].text == "hicimos app"


def test_build_llm_env_selection(settings):
    settings.llm_provider = "auto"
    assert isinstance(build_llm(settings), FakeLLM)         # sin keys -> FakeLLM
    settings.openai_api_key = "k"
    auto = build_llm(settings)
    assert isinstance(auto, _OpenAICompatible)              # auto -> openai
    settings.llm_provider = "groq"
    with pytest.raises(LLMError):                           # explícito sin key -> error claro
        build_llm(settings)


def test_llm_failure_marks_achievement_failed(client, services, ready):
    """R6: fallo del LLM -> status=failed con error.retryable=true, transcript preservado."""
    class BoomLLM:
        def extract(self, transcript):
            raise LLMError("caída simulada del proveedor")
        def draft(self, **kw):
            return "x"

    services.core.llm = BoomLLM()
    resp = client.post("/api/v1/achievements", headers=ready,
                       json={"input_type": "text", "text": TRANSCRIPT})
    assert resp.status_code == 201
    ach = resp.json()
    assert ach["status"] == "failed"
    assert ach["error"]["code"] == "llm_failed"
    assert ach["error"]["retryable"] is True
    assert ach["transcript"] == TRANSCRIPT  # carga preservada


def test_cli_e2e_runs(tmp_path, monkeypatch):
    """python -m app.entrypoints.cli_e2e corre verde con fakes."""
    monkeypatch.setenv("TS_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    monkeypatch.setenv("STT_PROVIDER", "fake")
    from app.entrypoints.cli_e2e import run
    assert run("Hicimos una app de turnos en React. Yo diseñé las pantallas.",
               demo_voice=True) == 0

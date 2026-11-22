from __future__ import annotations

import json

import httpx

from ..config import Settings
from ..models import ExtractionResult, Fact, Platform, VoiceContext
from .fake import FakeLLM
from .port import LLMError, LLMPort
from .prompts import EXTRACT_SYSTEM, draft_system

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
XAI_URL = "https://api.x.ai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _draft_user_payload(facts: list[Fact], voice: VoiceContext | None) -> str:
    return json.dumps(
        {
            "facts": [{"id": f.id, "category": f.category, "text": f.text}
                      for f in facts],
            "voice_context": voice.model_dump() if voice else None,
        },
        ensure_ascii=False,
    )


class _OpenAICompatible:
    """OpenAI, Groq y xAI comparten el API de chat/completions con JSON mode."""

    def __init__(self, url: str, api_key: str, model: str):
        self.url = url
        self.api_key = api_key
        self.model = model

    def _chat_json(self, system: str, user: str) -> dict:
        try:
            resp = httpx.post(
                self.url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                },
                timeout=45,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except httpx.HTTPError as e:
            raise LLMError(f"Proveedor LLM no respondió: {e}") from e
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise LLMError(f"Respuesta LLM inválida: {e}") from e

    def extract(self, transcript: str) -> ExtractionResult:
        data = self._chat_json(EXTRACT_SYSTEM, transcript)
        try:
            return ExtractionResult.model_validate(data)
        except Exception as e:
            raise LLMError(f"Extracción LLM con forma inválida: {e}") from e

    def draft(self, *, platform: Platform, facts: list[Fact],
              voice: VoiceContext | None, max_chars: int) -> str:
        data = self._chat_json(draft_system(platform, max_chars),
                               _draft_user_payload(facts, voice))
        body = data.get("body")
        if not isinstance(body, str) or not body.strip():
            raise LLMError("El LLM devolvió un borrador vacío.")
        return body


class _GeminiProvider:
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def _chat_json(self, system: str, user: str) -> dict:
        url = GEMINI_URL.format(model=self.model)
        try:
            resp = httpx.post(
                url,
                params={"key": self.api_key},
                json={
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": [{"parts": [{"text": user}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.3,
                    },
                },
                timeout=45,
            )
            resp.raise_for_status()
            content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(content)
        except httpx.HTTPError as e:
            raise LLMError(f"Gemini no respondió: {e}") from e
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise LLMError(f"Respuesta Gemini inválida: {e}") from e

    def extract(self, transcript: str) -> ExtractionResult:
        data = self._chat_json(EXTRACT_SYSTEM, transcript)
        try:
            return ExtractionResult.model_validate(data)
        except Exception as e:
            raise LLMError(f"Extracción Gemini con forma inválida: {e}") from e

    def draft(self, *, platform: Platform, facts: list[Fact],
              voice: VoiceContext | None, max_chars: int) -> str:
        data = self._chat_json(draft_system(platform, max_chars),
                               _draft_user_payload(facts, voice))
        body = data.get("body")
        if not isinstance(body, str) or not body.strip():
            raise LLMError("Gemini devolvió un borrador vacío.")
        return body


def build_llm(settings: Settings) -> LLMPort:
    """Selecciona proveedor. `auto`: primera API key presente; si no hay → FakeLLM.

    Para correr con modelo real: LLM_PROVIDER=openai|gemini|groq + su *_API_KEY.
    Tests usan LLM_PROVIDER=fake explícito.
    """
    provider = settings.llm_provider
    if provider == "fake":
        return FakeLLM()
    if provider == "auto":
        if settings.openai_api_key:
            provider = "openai"
        elif settings.gemini_api_key:
            provider = "gemini"
        elif settings.groq_api_key:
            provider = "groq"
        elif settings.xai_api_key:
            provider = "xai"
        else:
            return FakeLLM()
    if provider == "openai":
        if not settings.openai_api_key:
            raise LLMError("LLM_PROVIDER=openai requiere OPENAI_API_KEY.", code="missing_api_key")
        return _OpenAICompatible(OPENAI_URL, settings.openai_api_key, settings.openai_model)
    if provider == "groq":
        if not settings.groq_api_key:
            raise LLMError("LLM_PROVIDER=groq requiere GROQ_API_KEY.", code="missing_api_key")
        return _OpenAICompatible(GROQ_URL, settings.groq_api_key, settings.groq_model)
    if provider == "xai":
        if not settings.xai_api_key:
            raise LLMError("LLM_PROVIDER=xai requiere XAI_API_KEY.", code="missing_api_key")
        return _OpenAICompatible(XAI_URL, settings.xai_api_key, settings.xai_model)
    if provider == "gemini":
        if not settings.gemini_api_key:
            raise LLMError("LLM_PROVIDER=gemini requiere GEMINI_API_KEY.", code="missing_api_key")
        return _GeminiProvider(settings.gemini_api_key, settings.gemini_model)
    raise LLMError(f"LLM_PROVIDER desconocido: '{provider}'.", code="missing_api_key")

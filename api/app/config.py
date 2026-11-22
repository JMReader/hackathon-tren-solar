from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = API_DIR / ".data"

# Cuentas fijas para el pitch (spec docs/spec-login-demo.md). No es auth de
# producción: POST /session ya crea sesiones anónimas sin credenciales.
_DEMO_ACCOUNT_DEFAULTS = [
    {"email": "juanmcoro2003@gmail.com", "password": "Demo1234", "display_name": "Juan"},
    {"email": "mauromamani.b@gmail.com", "password": "Demo1234", "display_name": "Mauro"},
    {"email": "maykox34f@gmail.com", "password": "Demo1234", "display_name": "Mayko"},
    {"email": "riosmaurii@gmail.com", "password": "Demo1234", "display_name": "Mauri"},
]


def _demo_accounts(raw: str | None) -> list[dict]:
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed:
                return parsed
        except json.JSONDecodeError:
            pass
    return [dict(a) for a in _DEMO_ACCOUNT_DEFAULTS]


@dataclass
class Settings:
    db_path: Path
    media_dir: Path
    llm_provider: str = "auto"  # auto | fake | openai | gemini | groq | xai
    stt_provider: str = "auto"  # auto | fake | whisper | elevenlabs
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    xai_api_key: str | None = None
    postgres_dsn: str | None = None
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-3-flash-preview"
    groq_model: str = "llama-3.3-70b-versatile"
    xai_model: str = "grok-4.7"
    whisper_model: str = "whisper-1"
    elevenlabs_api_key: str | None = None
    elevenlabs_model: str = "scribe_v3"
    stt_language: str | None = None
    fake_transcript: str | None = None
    max_photo_bytes: int = 10 * 1024 * 1024
    max_audio_bytes: int = 25 * 1024 * 1024
    cors_origins: list[str] = field(default_factory=lambda: [
        "http://localhost:3000", "http://127.0.0.1:3000"])
    employer_demo: bool = False
    demo_accounts: list[dict] = field(default_factory=list)
    extra: dict = field(default_factory=dict)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        """Lee os.environ + api/.env (gitignored). Las variables de entorno reales
        tienen precedencia sobre el archivo."""
        file_env: dict[str, str] = {}
        dotenv = API_DIR / ".env"
        if dotenv.is_file():
            for line in dotenv.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    file_env[k.strip()] = v.strip().strip('"').strip("'")
        for k, v in file_env.items():
            os.environ.setdefault(k, v)
        merged = {**file_env, **(env if env is not None else os.environ)}
        env = merged
        data_dir = Path(env.get("TS_DATA_DIR", str(DEFAULT_DATA_DIR)))
        return cls(
            db_path=Path(env.get("TS_DB_PATH", str(data_dir / "app.db"))),
            media_dir=Path(env.get("TS_MEDIA_DIR", str(data_dir / "media"))),
            llm_provider=env.get("LLM_PROVIDER", "auto"),
            stt_provider=env.get("STT_PROVIDER", "auto"),
            openai_api_key=env.get("OPENAI_API_KEY"),
            gemini_api_key=env.get("GEMINI_API_KEY"),
            groq_api_key=env.get("GROQ_API_KEY"),
            xai_api_key=env.get("XAI_API_KEY"),
            postgres_dsn=env.get("POSTGRES_URL"),
            supabase_url=env.get("SUPABASE_URL"),
            supabase_service_role_key=env.get("SUPABASE_SERVICE_ROLE_KEY"),
            openai_model=env.get("OPENAI_MODEL", "gpt-4o-mini"),
            gemini_model=env.get("GEMINI_MODEL", "gemini-3-flash-preview"),
            groq_model=env.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            xai_model=env.get("XAI_MODEL", "grok-4.7"),
            whisper_model=env.get("WHISPER_MODEL", "whisper-1"),
            elevenlabs_api_key=env.get("ELEVENLABS_API_KEY"),
            elevenlabs_model=env.get("ELEVENLABS_MODEL", "scribe_v3"),
            stt_language=env.get("STT_LANGUAGE") or "es",
            fake_transcript=env.get("FAKE_TRANSCRIPT"),
            cors_origins=[o.strip() for o in env["CORS_ORIGINS"].split(",")
                          if o.strip()] if env.get("CORS_ORIGINS") else [
                "http://localhost:3000", "http://127.0.0.1:3000"],
            employer_demo=env.get("TS_EMPLOYER_DEMO", "") == "1",
            demo_accounts=_demo_accounts(env.get("DEMO_ACCOUNTS")),
        )

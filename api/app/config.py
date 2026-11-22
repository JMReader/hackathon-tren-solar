from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = API_DIR / ".data"


@dataclass
class Settings:
    db_path: Path
    media_dir: Path
    llm_provider: str = "auto"  # auto | fake | openai | gemini | groq
    stt_provider: str = "auto"  # auto | fake | whisper
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-3-flash-preview"
    groq_model: str = "llama-3.3-70b-versatile"
    whisper_model: str = "whisper-1"
    fake_transcript: str | None = None
    max_photo_bytes: int = 10 * 1024 * 1024
    max_audio_bytes: int = 25 * 1024 * 1024
    extra: dict = field(default_factory=dict)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        env = env if env is not None else os.environ
        data_dir = Path(env.get("TS_DATA_DIR", str(DEFAULT_DATA_DIR)))
        return cls(
            db_path=Path(env.get("TS_DB_PATH", str(data_dir / "app.db"))),
            media_dir=Path(env.get("TS_MEDIA_DIR", str(data_dir / "media"))),
            llm_provider=env.get("LLM_PROVIDER", "auto"),
            stt_provider=env.get("STT_PROVIDER", "auto"),
            openai_api_key=env.get("OPENAI_API_KEY"),
            gemini_api_key=env.get("GEMINI_API_KEY"),
            groq_api_key=env.get("GROQ_API_KEY"),
            openai_model=env.get("OPENAI_MODEL", "gpt-4o-mini"),
            gemini_model=env.get("GEMINI_MODEL", "gemini-3-flash-preview"),
            groq_model=env.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            whisper_model=env.get("WHISPER_MODEL", "whisper-1"),
            fake_transcript=env.get("FAKE_TRANSCRIPT"),
        )

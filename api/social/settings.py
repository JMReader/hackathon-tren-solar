from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

from .linkedin import DEFAULT_API_VERSION, LinkedInConfig
from .x import XConfig


@dataclass(frozen=True)
class Settings:
    token_key: str | None
    web_base_url: str
    linkedin: LinkedInConfig | None = None
    x: XConfig | None = None

    @classmethod
    def from_env(cls, env: Mapping[str, str] = os.environ) -> Settings:
        def get(name: str) -> str:
            return env.get(name, "").strip()

        token_key = get("SOCIAL_TOKEN_KEY") or None
        linkedin = (
            LinkedInConfig(
                client_id=get("LINKEDIN_CLIENT_ID"),
                client_secret=get("LINKEDIN_CLIENT_SECRET"),
                redirect_uri=get("LINKEDIN_REDIRECT_URI"),
                api_version=get("LINKEDIN_API_VERSION") or DEFAULT_API_VERSION,
            )
            if token_key
            and get("LINKEDIN_CLIENT_ID")
            and get("LINKEDIN_CLIENT_SECRET")
            and get("LINKEDIN_REDIRECT_URI")
            else None
        )
        x = (
            XConfig(
                client_id=get("X_CLIENT_ID"),
                client_secret=get("X_CLIENT_SECRET"),
                redirect_uri=get("X_REDIRECT_URI"),
                allow_links=get("X_ALLOW_LINKS").lower() in {"1", "true", "yes"},
            )
            if token_key and get("X_CLIENT_ID") and get("X_CLIENT_SECRET") and get("X_REDIRECT_URI")
            else None
        )
        return cls(
            token_key=token_key,
            web_base_url=get("SOCIAL_WEB_BASE_URL") or "http://localhost:3000",
            linkedin=linkedin,
            x=x,
        )

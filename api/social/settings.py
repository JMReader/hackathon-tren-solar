from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

from .linkedin import DEFAULT_API_VERSION, LinkedInConfig


@dataclass(frozen=True)
class Settings:
    token_key: str | None
    web_base_url: str
    linkedin: LinkedInConfig | None = None

    @classmethod
    def from_env(cls, env: Mapping[str, str] = os.environ) -> Settings:
        token_key = env.get("SOCIAL_TOKEN_KEY", "").strip() or None
        client_id = env.get("LINKEDIN_CLIENT_ID", "").strip()
        client_secret = env.get("LINKEDIN_CLIENT_SECRET", "").strip()
        redirect_uri = env.get("LINKEDIN_REDIRECT_URI", "").strip()
        linkedin = (
            LinkedInConfig(
                client_id=client_id,
                client_secret=client_secret,
                redirect_uri=redirect_uri,
                api_version=env.get("LINKEDIN_API_VERSION", "").strip() or DEFAULT_API_VERSION,
            )
            if token_key and client_id and client_secret and redirect_uri
            else None
        )
        return cls(
            token_key=token_key,
            web_base_url=env.get("SOCIAL_WEB_BASE_URL", "").strip() or "http://localhost:3000",
            linkedin=linkedin,
        )

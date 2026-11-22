from __future__ import annotations

from dataclasses import dataclass

import httpx2

from .adapters import default_adapters
from .linkedin import LinkedInAdapter
from .models import Platform
from .oauth import RefreshingConnectionStore
from .ports import ConnectionStore, OAuthProvider, SocialAdapter
from .settings import Settings
from .x import XAdapter


@dataclass(frozen=True)
class Providers:
    adapters: dict[Platform, SocialAdapter]
    oauth: dict[Platform, OAuthProvider]
    connections: ConnectionStore


def build_providers(settings: Settings, store: ConnectionStore, http: httpx2.Client) -> Providers:
    linkedin = LinkedInAdapter(settings.linkedin, http) if settings.linkedin else None
    x = XAdapter(settings.x, http) if settings.x else None
    return Providers(
        adapters=default_adapters(linkedin, x),
        oauth={adapter.platform: adapter for adapter in (linkedin, x) if adapter},
        connections=RefreshingConnectionStore(store, {Platform.X: x} if x else {}),
    )

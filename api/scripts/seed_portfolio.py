"""Snapshot público válido para portfolios sembrados."""

from __future__ import annotations

import json
from typing import Any

from app.models import Achievement
from app.portfolio import catalog


def portfolio_items_json(achievement_id: str, title: str) -> str:
    payload = [{
        "achievement_id": achievement_id,
        "title": title,
        "occurred_on": "2026-11",
        "show_photo": False,
    }]
    return json.dumps(payload, ensure_ascii=False)


def build_published_snapshot(
    *,
    slug: str,
    display_name: str,
    headline: str | None,
    achievement: Achievement,
    template_id: str = "recorrido",
    palette_id: str = "verde-yunga",
    published_at: str,
) -> str:
    palette = catalog.find_palette(palette_id)
    if palette is None:
        raise ValueError(f"Paleta desconocida: {palette_id}")
    facts = [
        {"category": f.category, "text": f.text, "source": f.source}
        for f in achievement.facts[:4]
    ]
    if not facts:
        facts = [{"category": "learning", "text": "Demo sintética", "source": "user"}]
    snapshot: dict[str, Any] = {
        "slug": slug,
        "display_name": f"{display_name} (demo)",
        "headline": headline,
        "photo_url": None,
        "template_id": template_id,
        "palette": palette,
        "items": [{
            "title": f"Logro: {headline or 'portfolio demo'}",
            "occurred_on": "2026-11",
            "photo_url": None,
            "facts": facts,
        }],
        "cv_url": None,
        "published_at": published_at,
    }
    return json.dumps(snapshot, ensure_ascii=False)
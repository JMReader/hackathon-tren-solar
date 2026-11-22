from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi.responses import FileResponse

from ..errors import ApiError, invalid_state, not_found, revision_conflict
from ..ids import new_id
from ..media_store import MediaStore
from . import catalog
from .models import (
    CreatePortfolioRequest,
    Portfolio,
    PortfolioItemInput,
    ProInterestRequest,
    PublicPortfolio,
    PublishPortfolioRequest,
    UpdatePortfolioRequest,
)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _as_dict(row: Any) -> dict[str, Any]:
    if isinstance(row, dict):
        return row
    return dict(row)


def _slugify(name: str) -> str:
    norm = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-")
    if len(slug) < 3:
        slug = f"autor-{new_id('pf')[-8:]}"
    return slug[:60]


DEFAULT_TEMPLATE_ID = "esencial"
DEFAULT_PALETTE_ID = "azul-salina"
MAX_ITEMS = 12


def _default_title(achievement) -> str:
    text = achievement.facts[0].text.strip() if achievement.facts else ""
    if len(text) < 3:
        return "Mi logro"
    return text if len(text) <= 80 else f"{text[:77]}..."


class PortfolioService:
    def __init__(self, store, media: MediaStore):
        self.store = store
        self.media = media

    def get_catalog(self) -> dict:
        return catalog.catalog_payload()

    def _has_cv(self, session_id: str) -> bool:
        row = self.store.get_profile(session_id)
        if row is None:
            return False
        profile, _ = row
        return profile.cv_document is not None

    def _headline(self, session_id: str, stored: str | None) -> str | None:
        if stored is not None:
            return stored
        row = self.store.get_profile(session_id)
        if row is None:
            return None
        profile, _ = row
        return profile.profession

    def _validate_catalog_ids(self, template_id: str, palette_id: str) -> None:
        if catalog.find_template(template_id) is None:
            raise not_found("template", template_id)
        if catalog.find_palette(palette_id) is None:
            raise not_found("palette", palette_id)

    def _check_pro(self, template_id: str, palette_id: str) -> None:
        if catalog.is_pro_template(template_id) or catalog.is_pro_palette(palette_id):
            raise ApiError(
                422, "pro_required",
                "La plantilla o paleta elegida requiere plan Pro.",
            )

    def _validate_items(self, session_id: str, items: list[PortfolioItemInput]) -> None:
        for item in items:
            ach = self.store.get_achievement(item.achievement_id)
            if ach is None:
                raise not_found("achievement", item.achievement_id)
            owner = self.store.achievement_session(item.achievement_id)
            if owner != session_id:
                raise not_found("achievement", item.achievement_id)
            if ach.status != "approved":
                raise ApiError(
                    422, "achievement_not_approved",
                    f"El logro '{item.achievement_id}' debe estar aprobado.",
                )

    def _row_to_portfolio(self, row: dict[str, Any], session_id: str) -> Portfolio:
        items = [PortfolioItemInput.model_validate(i) for i in json.loads(row["items"])]
        slug = row["slug"]
        status = row["status"]
        public_url = f"/p/{slug}" if slug and status == "published" else None
        return Portfolio(
            id=row["id"],
            status=status,
            revision=row["revision"],
            display_name=row["display_name"],
            headline=row["headline"],
            items=items,
            template_id=row["template_id"],
            palette_id=row["palette_id"],
            cv_downloadable=bool(row["cv_downloadable"]),
            has_cv=self._has_cv(session_id),
            slug=slug,
            public_url=public_url,
            published_revision=row["published_revision"],
            published_at=row["published_at"],
        )

    def _require_owned(self, portfolio_id: str, session_id: str) -> dict[str, Any]:
        row = self.store.get_portfolio(portfolio_id)
        if row is None or _as_dict(row)["session_id"] != session_id:
            raise not_found("portfolio", portfolio_id)
        return _as_dict(row)

    def create(self, session_id: str, req: CreatePortfolioRequest) -> Portfolio:
        self._validate_catalog_ids(req.template_id, req.palette_id)
        self._check_pro(req.template_id, req.palette_id)
        self._validate_items(session_id, req.items)
        pf_id = new_id("pf")
        now = _now()
        row = {
            "id": pf_id,
            "session_id": session_id,
            "status": "draft",
            "revision": 1,
            "display_name": req.display_name,
            "headline": req.headline,
            "items": json.dumps([i.model_dump() for i in req.items], ensure_ascii=False),
            "template_id": req.template_id,
            "palette_id": req.palette_id,
            "cv_downloadable": 1 if req.cv_downloadable else 0,
            "slug": None,
            "published_revision": None,
            "published_snapshot": None,
            "published_at": None,
            "created_at": now,
            "updated_at": now,
        }
        self.store.save_portfolio(row)
        return self._row_to_portfolio(row, session_id)

    def get(self, portfolio_id: str, session_id: str) -> Portfolio:
        row = self._require_owned(portfolio_id, session_id)
        return self._row_to_portfolio(row, session_id)

    def get_current(self, session_id: str) -> Portfolio:
        row = self.store.get_portfolio_by_session(session_id)
        if row is None:
            raise not_found("portfolio", "current")
        return self._row_to_portfolio(_as_dict(row), session_id)

    def add_achievement(self, session_id: str, achievement) -> str:
        """Suma un logro aprobado al borrador del portfolio de la sesión (Issue #37).

        No toca el snapshot publicado. Devuelve qué pasó, sin lanzar errores:
        aprobar un logro no puede fallar porque el portfolio no lo recibió.
        """
        if achievement.status != "approved":
            return "not_approved"
        if not self._has_cv(session_id):
            return "cv_required"
        item = PortfolioItemInput(
            achievement_id=achievement.id, title=_default_title(achievement))
        existing = self.store.get_portfolio_by_session(session_id)
        if existing is None:
            profile, _ = self.store.get_profile(session_id)
            name = (profile.profession or "").strip()
            self.create(session_id, CreatePortfolioRequest(
                display_name=name[:60] if len(name) >= 2 else "Tu portfolio",
                items=[item],
                template_id=DEFAULT_TEMPLATE_ID,
                palette_id=DEFAULT_PALETTE_ID,
            ))
            return "created"
        row = _as_dict(existing)
        items = json.loads(row["items"])
        if any(i["achievement_id"] == achievement.id for i in items):
            return "already_present"
        if len(items) >= MAX_ITEMS:
            return "full"
        items.append(item.model_dump())
        row["items"] = json.dumps(items, ensure_ascii=False)
        row["revision"] = row["revision"] + 1
        row["updated_at"] = _now()
        self.store.save_portfolio(row)
        return "added"

    def add_to_current(self, session_id: str, achievement_id: str) -> Portfolio:
        """La persona eligió sumar un logro aprobado a su portfolio."""
        achievement = self.store.get_achievement(achievement_id)
        if achievement is None or self.store.achievement_session(achievement_id) != session_id:
            raise not_found("achievement", achievement_id)
        outcome = self.add_achievement(session_id, achievement)
        if outcome == "not_approved":
            raise ApiError(422, "achievement_not_approved",
                           f"El logro '{achievement_id}' debe estar aprobado.")
        if outcome == "cv_required":
            raise ApiError(422, "cv_required", "Subí tu CV para tener portfolio.")
        if outcome == "full":
            raise ApiError(422, "portfolio_full",
                           f"El portfolio ya tiene {MAX_ITEMS} logros. Quitá uno para sumar otro.")
        return self.get_current(session_id)

    def update(self, portfolio_id: str, session_id: str,
               req: UpdatePortfolioRequest) -> Portfolio:
        row = self._require_owned(portfolio_id, session_id)
        if req.revision != row["revision"]:
            raise revision_conflict("portfolio", req.revision, row["revision"])
        template_id = req.template_id if req.template_id is not None else row["template_id"]
        palette_id = req.palette_id if req.palette_id is not None else row["palette_id"]
        self._validate_catalog_ids(template_id, palette_id)
        self._check_pro(template_id, palette_id)
        items_raw = json.loads(row["items"])
        if req.items is not None:
            self._validate_items(session_id, req.items)
            items_raw = [i.model_dump() for i in req.items]
        row["revision"] = row["revision"] + 1
        if req.display_name is not None:
            row["display_name"] = req.display_name
        if req.headline is not None:
            row["headline"] = req.headline
        row["items"] = json.dumps(items_raw, ensure_ascii=False)
        row["template_id"] = template_id
        row["palette_id"] = palette_id
        if req.cv_downloadable is not None:
            row["cv_downloadable"] = 1 if req.cv_downloadable else 0
        row["updated_at"] = _now()
        self.store.save_portfolio(row)
        return self._row_to_portfolio(row, session_id)

    def _unique_slug(self, desired: str, portfolio_id: str) -> str:
        slug = desired
        n = 2
        while self.store.portfolio_slug_taken(slug, exclude_id=portfolio_id):
            suffix = f"-{n}"
            slug = f"{desired[:60 - len(suffix)]}{suffix}"
            n += 1
        return slug

    def _build_snapshot(self, row: dict[str, Any], session_id: str, slug: str) -> dict:
        profile_row = self.store.get_profile(session_id)
        if profile_row is None:
            raise invalid_state("Perfil de sesión inexistente.")
        profile, _ = profile_row
        palette = catalog.find_palette(row["palette_id"])
        assert palette is not None
        base = "/api/v1"
        photo_url = (
            f"{base}/p/{slug}/media/{profile.photo_id}" if profile.photo_id else None
        )
        cv_url = None
        if row["cv_downloadable"] and profile.cv_document:
            cv_url = f"{base}/p/{slug}/cv"
        items_out = []
        for raw in json.loads(row["items"]):
            item = PortfolioItemInput.model_validate(raw)
            ach = self.store.get_achievement(item.achievement_id)
            assert ach is not None
            facts = [
                {"category": f.category, "text": f.text, "source": f.source}
                for f in ach.facts
            ]
            photo_item = None
            if item.show_photo and ach.photo_id:
                photo_item = f"{base}/p/{slug}/media/{ach.photo_id}"
            items_out.append({
                "title": item.title,
                "occurred_on": item.occurred_on,
                "photo_url": photo_item,
                "facts": facts,
            })
        return {
            "slug": slug,
            "display_name": row["display_name"],
            "headline": row["headline"] or profile.profession,
            "photo_url": photo_url,
            "template_id": row["template_id"],
            "palette": palette,
            "items": items_out,
            "cv_url": cv_url,
            "published_at": _now(),
        }

    def publish(self, portfolio_id: str, session_id: str,
                req: PublishPortfolioRequest) -> Portfolio:
        row = self._require_owned(portfolio_id, session_id)
        if req.revision != row["revision"]:
            raise revision_conflict("portfolio", req.revision, row["revision"])
        if req.confirm_public is not True:
            raise ApiError(
                422, "confirm_public_required",
                "Debés confirmar con confirm_public: true.",
            )
        if not self._has_cv(session_id):
            raise ApiError(
                422, "cv_required",
                "Subí tu CV en la sesión antes de publicar el portfolio.",
            )
        if req.slug:
            if self.store.portfolio_slug_taken(req.slug, exclude_id=portfolio_id):
                raise invalid_state(f"El slug '{req.slug}' ya está en uso.")
            slug = req.slug
        else:
            slug = self._unique_slug(_slugify(row["display_name"]), portfolio_id)
        snapshot = self._build_snapshot(row, session_id, slug)
        now = snapshot["published_at"]
        row["status"] = "published"
        row["slug"] = slug
        row["published_revision"] = row["revision"]
        row["published_snapshot"] = json.dumps(snapshot, ensure_ascii=False)
        row["published_at"] = now
        row["updated_at"] = now
        self.store.save_portfolio(row)
        return self._row_to_portfolio(row, session_id)

    def unpublish(self, portfolio_id: str, session_id: str) -> Portfolio:
        row = self._require_owned(portfolio_id, session_id)
        if row["status"] != "published":
            raise invalid_state("El portfolio no está publicado.")
        row["status"] = "revoked"
        row["updated_at"] = _now()
        self.store.save_portfolio(row)
        return self._row_to_portfolio(row, session_id)

    def get_public(self, slug: str) -> PublicPortfolio:
        row = self.store.get_portfolio_by_slug(slug)
        data = _as_dict(row) if row else {}
        if not row or data.get("status") != "published" or not data.get("published_snapshot"):
            raise not_found("portfolio", slug)
        return PublicPortfolio.model_validate(json.loads(data["published_snapshot"]))

    def _snapshot_media_ids(self, snapshot: dict) -> set[str]:
        allowed: set[str] = set()
        if snapshot.get("photo_url"):
            allowed.add(snapshot["photo_url"].rstrip("/").split("/")[-1])
        for item in snapshot.get("items", []):
            url = item.get("photo_url")
            if url:
                allowed.add(url.rstrip("/").split("/")[-1])
        return allowed

    def get_public_media(self, slug: str, media_id: str) -> FileResponse:
        row = _as_dict(self.store.get_portfolio_by_slug(slug) or {})
        if not row or row.get("status") != "published" or not row.get("published_snapshot"):
            raise not_found("media", media_id)
        snapshot = json.loads(row["published_snapshot"])
        if media_id not in self._snapshot_media_ids(snapshot):
            raise not_found("media", media_id)
        path = self.media.local_path(media_id)
        if not path or not Path(path).is_file():
            raise not_found("media", media_id)
        mime = self.store.get_media(media_id)
        media_type = mime.mime_type if mime else "application/octet-stream"
        return FileResponse(path, media_type=media_type)

    def get_public_cv(self, slug: str) -> FileResponse:
        row = _as_dict(self.store.get_portfolio_by_slug(slug) or {})
        if not row or row.get("status") != "published" or not row.get("published_snapshot"):
            raise not_found("portfolio", slug)
        if not row.get("cv_downloadable"):
            raise not_found("cv", slug)
        snapshot = json.loads(row["published_snapshot"])
        if not snapshot.get("cv_url"):
            raise not_found("cv", slug)
        session_id = row["session_id"]
        profile_row = self.store.get_profile(session_id)
        if profile_row is None:
            raise not_found("cv", slug)
        profile, _ = profile_row
        if profile.cv_document is None:
            raise not_found("cv", slug)
        cv_id = profile.cv_document.cv_id
        cv_row = self.store.get_cv(cv_id)
        if cv_row is None:
            raise not_found("cv", slug)
        ref = cv_row["local_path"] if isinstance(cv_row, dict) else cv_row["local_path"]
        path: str | None
        if hasattr(self.media, "materialize_cv"):
            mat = self.media.materialize_cv(ref)  # type: ignore[attr-defined]
            path = str(mat) if mat and mat.is_file() else None
        else:
            path = str(Path(self.media.cv_path(cv_id, ".pdf")))
            if not Path(path).is_file():
                path = ref if Path(ref).is_file() else None
        if not path or not Path(path).is_file():
            raise not_found("cv", slug)
        return FileResponse(path, media_type="application/pdf",
                            filename=f"{slug}-cv.pdf")

    def register_pro_interest(self, session_id: str, req: ProInterestRequest) -> None:
        self.store.save_pro_interest_event({
            "id": new_id("pro"),
            "session_id": session_id,
            "response": req.response,
            "trigger": req.trigger,
            "item_id": req.item_id,
            "price_band_ars_month": req.price_band_ars_month,
            "created_at": _now(),
        })
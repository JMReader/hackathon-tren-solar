from __future__ import annotations

import hashlib
import mimetypes
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .db import Store
from .errors import ApiError, ProfileResponse, bad_request, not_found
from .ids import new_id
from .media_store import MediaStore
from .models import (
    AuthorProfile,
    CompleteOnboardingRequest,
    CvDocument,
    LoginResponse,
    SamplePosts,
    SessionCreated,
    SetAuthorProfilePhotoRequest,
    StyleSync,
    StyleSyncResult,
    SyncStyleRequest,
    UpdateAuthorProfileRequest,
    VoiceContext,
    VoicePreferences,
)
from .style_reader import StyleReaderPort

CV_MIMES = {"application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"}
CV_EXTS = {".pdf", ".doc", ".docx", ".txt"}
DEFAULT_TTL_HOURS = 24


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _skipped_sync() -> StyleSync:
    empty = StyleSyncResult(status="skipped", posts_imported=0)
    return StyleSync(last_attempt_at=None, linkedin=empty, x=empty)


class SessionService:
    """Sesiones anónimas + onboarding de autor (decisión 2026-11-22)."""

    def __init__(self, store: Store, media: MediaStore,
                 style_reader: StyleReaderPort, ttl_hours: int = DEFAULT_TTL_HOURS,
                 demo_accounts: list[dict] | None = None):
        self.store = store
        self.media = media
        self.style_reader = style_reader
        self.ttl_hours = ttl_hours
        self.demo_accounts = demo_accounts or []

    # --- sesión ---

    def create_session(self) -> SessionCreated:
        session_id = new_id("ses")
        created = _now()
        expires = created + timedelta(hours=self.ttl_hours)
        self.store.save_session(session_id, created.isoformat(), expires.isoformat())
        profile = AuthorProfile(
            session_id=session_id, onboarding_status="not_started", revision=1,
            ready_for_achievement=False, style_sync=_skipped_sync(),
        )
        self.store.save_profile(profile, {"linkedin": [], "x": []}, created.isoformat())
        return SessionCreated(session_id=session_id, expires_at=expires.isoformat())

    def require_session(self, session_id: str | None) -> str:
        if not session_id:
            raise ApiError(401, "session_missing",
                           "Falta el header X-Session-Id. Creá sesión con POST /session.")
        row = self.store.get_session(session_id)
        if row is None:
            raise ApiError(401, "session_invalid", f"Sesión '{session_id}' no existe.")
        if datetime.fromisoformat(row["expires_at"]) < _now():
            raise ApiError(401, "session_expired",
                           "La sesión venció; creá una nueva con POST /session.")
        return session_id

    def demo_login(self, email: str, password: str) -> LoginResponse:
        """Login de pitch (docs/spec-login-demo.md): cuenta fija → sesión
        estable por cuenta (find-or-create), así cada integrante vuelve
        siempre a su espacio. Mismo 401 para cualquier fallo."""
        normalized = email.strip().lower()
        account = next(
            (a for a in self.demo_accounts
             if str(a.get("email", "")).lower() == normalized
             and a.get("password") == password), None)
        if account is None:
            raise ApiError(401, "invalid_credentials",
                           "Correo o contraseña incorrectos.")
        display_name = str(account.get("display_name") or normalized)
        session_id = self._demo_session(normalized)
        profile, _ = self._load(session_id)
        if not profile.profession:  # no pisar la profesión que cargó la persona
            self.update_profile(session_id, UpdateAuthorProfileRequest(
                revision=profile.revision, profession=display_name))
        return LoginResponse(session_id=session_id,
                             display_name=display_name)

    def _demo_session(self, account_key: str) -> str:
        """Sesión determinística por cuenta: reusa la existente (y refresca
        su TTL vía save_session idempotente) o crea una nueva con perfil."""
        digest = hashlib.sha256(account_key.encode()).hexdigest()[:12]
        session_id = f"ses_demo_{digest}"
        now = _now()
        self.store.save_session(
            session_id, now.isoformat(),
            (now + timedelta(hours=self.ttl_hours)).isoformat())
        if self.store.get_profile(session_id) is None:
            profile = AuthorProfile(
                session_id=session_id, onboarding_status="not_started",
                revision=1, ready_for_achievement=False,
                style_sync=_skipped_sync())
            self.store.save_profile(
                profile, {"linkedin": [], "x": []}, now.isoformat())
        return session_id

    # --- perfil ---

    def get_profile(self, session_id: str) -> AuthorProfile:
        found = self.store.get_profile(session_id)
        if found is None:
            raise not_found("session/profile", session_id)
        return found[0]

    def _load(self, session_id: str) -> tuple[AuthorProfile, dict]:
        found = self.store.get_profile(session_id)
        if found is None:
            raise not_found("session/profile", session_id)
        return found

    def _check_revision(self, profile: AuthorProfile, revision: int) -> None:
        if revision != profile.revision:
            raise ApiError(
                409, "profile_revision_conflict",
                f"Revisión de perfil desactualizada: enviaste {revision}, "
                f"la actual es {profile.revision}. Releé el perfil y reintentá.")

    def _save(self, profile: AuthorProfile, sample_posts: dict) -> AuthorProfile:
        profile.revision += 1
        self.store.save_profile(profile, sample_posts, _now().isoformat())
        return self.get_profile(profile.session_id)

    def _touch(self, profile: AuthorProfile) -> None:
        if profile.onboarding_status == "not_started":
            profile.onboarding_status = "in_progress"

    def update_profile(self, session_id: str,
                       req: UpdateAuthorProfileRequest) -> AuthorProfile:
        profile, sample_posts = self._load(session_id)
        self._check_revision(profile, req.revision)
        if "profession" in req.model_fields_set:
            profile.profession = req.profession
        if "writing_sample" in req.model_fields_set:
            if req.writing_sample is not None and len(req.writing_sample) < 20:
                raise bad_request(
                    "writing_sample necesita al menos 20 caracteres para imitar estilo.",
                    code="writing_sample_too_short")
            profile.writing_sample = req.writing_sample
        self._touch(profile)
        return self._save(profile, sample_posts)

    def set_profile_photo(self, session_id: str,
                          req: SetAuthorProfilePhotoRequest) -> AuthorProfile:
        profile, sample_posts = self._load(session_id)
        self._check_revision(profile, req.revision)
        owner = self.store.media_session(req.photo_id)
        if owner is None or owner != session_id:
            raise not_found("media", req.photo_id)
        profile.photo_id = req.photo_id
        self._touch(profile)
        return self._save(profile, sample_posts)

    def upload_cv(self, session_id: str, data: bytes, filename: str | None,
                  content_type: str | None) -> AuthorProfile:
        profile, sample_posts = self._load(session_id)
        ext = Path(filename or "").suffix.lower()
        mime = content_type or mimetypes.guess_type(filename or "")[0] or ""
        if mime not in CV_MIMES and ext not in CV_EXTS:
            raise bad_request(f"CV no soportado: '{mime or ext}'. Usá PDF, DOC o TXT.",
                              code="unsupported_media_type")
        if len(data) > self.media.max_photo_bytes:
            raise bad_request("El CV supera el máximo de 10 MB.", code="media_too_large")
        cv_id = new_id("cv")
        ext = Path(filename or "").suffix.lower()
        local_path = self.media.cv_path(cv_id, ext)
        if hasattr(self.media, "backend"):
            local_path = self.media.backend.put(local_path, data, mime or "application/octet-stream")
        else:
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)
            Path(local_path).write_bytes(data)
        self.store.save_cv(cv_id, session_id, mime or "application/octet-stream",
                           len(data), str(local_path), _now().isoformat())
        profile.cv_document = CvDocument(cv_id=cv_id, mime_type=mime or "application/octet-stream",
                                         size_bytes=len(data))
        self._touch(profile)
        return self._save(profile, sample_posts)

    def sync_style(self, session_id: str, req: SyncStyleRequest) -> AuthorProfile:
        profile, sample_posts = self._load(session_id)
        sync = profile.style_sync
        sync.last_attempt_at = _now().isoformat()
        any_success = False
        for platform in dict.fromkeys(req.platforms):
            outcome = self.style_reader.fetch_recent_posts(
                session_id, platform, req.max_posts_per_platform,
                req.linkedin_profile_url if platform == "linkedin" else None)
            result = StyleSyncResult(
                status=outcome.status, posts_imported=len(outcome.posts),
                message=outcome.message)
            setattr(sync, platform, result)
            if outcome.status == "succeeded":
                any_success = True
                sample_posts[platform] = outcome.posts
        self._touch(profile)
        profile.style_sync = sync
        updated = self._save(profile, sample_posts)
        if not any_success:
            raise ProfileResponse(503, updated)
        return updated

    def complete_onboarding(self, session_id: str,
                            req: CompleteOnboardingRequest) -> AuthorProfile:
        profile, sample_posts = self._load(session_id)
        self._check_revision(profile, req.revision)
        missing = []
        if not profile.profession:
            missing.append("profession")
        if not profile.photo_id:
            missing.append("photo_id")
        has_posts = any(sample_posts.get(p) for p in ("linkedin", "x"))
        has_sample = bool(profile.writing_sample) and len(profile.writing_sample) >= 20
        if not (has_posts or has_sample):
            missing.append("writing_sample>=20 o sample_posts de una red")
        if missing:
            raise bad_request(
                f"Faltan campos obligatorios para completar onboarding: {', '.join(missing)}.",
                code="onboarding_requirements_missing")
        posts = SamplePosts(linkedin=sample_posts.get("linkedin", []),
                            x=sample_posts.get("x", []))
        if not has_posts and profile.writing_sample:
            posts = SamplePosts(linkedin=[profile.writing_sample],
                                x=[profile.writing_sample])
        profile.voice_context = VoiceContext(
            language="es-AR", author_hint=profile.profession,
            sample_posts=posts, preferences=VoicePreferences(),
        )
        profile.onboarding_status = "complete"
        return self._save(profile, sample_posts)

    def profile_voice_context(self, session_id: str) -> VoiceContext | None:
        profile = self.get_profile(session_id)
        if profile.onboarding_status == "complete":
            return profile.voice_context
        return None

    def ready_for_achievement(self, session_id: str) -> bool:
        return self.get_profile(session_id).ready_for_achievement

from __future__ import annotations

import re
from datetime import datetime, timezone

from .db import Store
from .errors import ApiError, bad_request, invalid_state, not_found, revision_conflict
from .ids import new_id
from .llm.port import LLMError, LLMPort
from .media_store import MediaStore
from .models import (
    Achievement,
    ApproveAchievementRequest,
    Draft,
    ErrorDetail,
    Fact,
    GenerateDraftsRequest,
    GenerateDraftsResponse,
    MAX_CHARS,
    MediaAsset,
    OpenQuestion,
    PublishableDraft,
    UpdateAchievementRequest,
    UpdateDraftRequest,
    VoiceContext,
)
from .stt.port import STTError, TranscriberPort


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def quote_grounded(quote: str | None, transcript: str) -> bool:
    """R1: la cita debe existir literalmente en el transcript."""
    if not quote:
        return False
    return _norm(quote) in _norm(transcript)


def fit_to_limit(body: str, max_chars: int) -> str:
    """Compresión determinista: recorta oraciones desde el final; si una sola
    oración excede, trunca en el último espacio y agrega '…' (R5)."""
    body = body.strip()
    if len(body) <= max_chars:
        return body
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", body) if s.strip()]
    while len(sentences) > 1 and len(" ".join(sentences)) > max_chars:
        sentences.pop()
    body = " ".join(sentences)
    if len(body) > max_chars:
        cut = body[: max_chars - 1]
        cut = cut[: cut.rfind(" ")] if " " in cut else cut
        body = cut.rstrip(" .,;:") + "…"
    return body


class CoreService:
    """Servicios de dominio del issue #3, compartidos por HTTP, CLI y MCP.

    Todos los recursos pertenecen a una sesión anónima: `session_id` viaja en
    cada operación y una sesión ajena ve 404 (aislamiento por sesión).
    """

    def __init__(self, store: Store, media: MediaStore, llm: LLMPort,
                 transcriber: TranscriberPort | None = None):
        self.store = store
        self.media = media
        self.llm = llm
        self.transcriber = transcriber

    # --- media ---

    def upload_media(self, session_id: str, data: bytes, filename: str | None,
                     content_type: str | None, alt_text: str | None) -> MediaAsset:
        return self.media.save_photo(data, filename, content_type, alt_text, session_id)

    # --- achievements ---

    def _check_ready(self, session_id: str) -> None:
        """403 si el onboarding no está completo (HTTP siempre pasa por acá)."""
        found = self.store.get_profile(session_id)
        ready = found[0].ready_for_achievement if found else False
        if not ready:
            raise ApiError(
                403, "onboarding_incomplete",
                "Onboarding incompleto: se necesita profesión, foto y una fuente de "
                "estilo (writing_sample o posts importados). Completá /session/profile/complete.")

    def create_achievement(
        self,
        *,
        session_id: str,
        input_type: str,
        bypass_onboarding_gate: bool = False,
        text: str | None = None,
        photo_id: str | None = None,
        source_metadata: dict | None = None,
        audio: tuple[bytes, str | None, str | None] | None = None,
        photo: tuple[bytes, str | None, str | None] | None = None,
    ) -> Achievement:
        if not bypass_onboarding_gate:
            self._check_ready(session_id)
        if photo is not None:
            photo_id = self.media.save_photo(*photo, alt_text=None,
                                             session_id=session_id).photo_id
        elif photo_id is not None:
            self.media.resolve_photo(photo_id, session_id)

        audio_path: str | None = None
        transcript = (text or "").strip()
        error: ErrorDetail | None = None

        if audio is not None:
            audio_path = self.media.save_audio(*audio)
            if self.transcriber is None:
                error = ErrorDetail(code="stt_unavailable",
                                    message="No hay transcriptor configurado.",
                                    retryable=True)
            else:
                try:
                    transcript = self.transcriber.transcribe(audio_path, audio[2])
                    if text:
                        transcript = f"{transcript.strip()} {text.strip()}"
                except STTError as e:
                    error = ErrorDetail(code=e.code, message=str(e), retryable=True)
        if not transcript:
            if error is None:
                raise bad_request("Se necesita `text` (>=10 chars) o `audio`.",
                                  code="missing_input")

        facts: list[Fact] = []
        questions: list[OpenQuestion] = []
        if error is None:
            try:
                result = self.llm.extract(transcript)
            except LLMError as e:
                error = ErrorDetail(code=e.code, message=str(e), retryable=True)
            else:
                fact_source = "mcp" if input_type == "mcp" else "transcript"
                n = 0
                for f in result.facts:
                    if quote_grounded(f.source_quote, transcript):
                        n += 1
                        facts.append(Fact(id=f"fact_{n}", category=f.category,
                                          text=f.text, source_quote=f.source_quote,
                                          source=fact_source))
                    else:
                        # R1: afirmación sin respaldo textual → pregunta, nunca hecho.
                        questions.append(OpenQuestion(
                            id=f"q_{len(questions) + 1}", field="unverified_claim",
                            question=f"Afirmación sin respaldo en el texto: '{f.text}'. ¿Confirmar?",
                        ))
                for q in result.open_questions:
                    questions.append(OpenQuestion(
                        id=f"q_{len(questions) + 1}", field=q.field, question=q.question))

        status = "failed" if error else "needs_review"
        achievement = Achievement(
            id=new_id("ach"), input_type=input_type, status=status, revision=1,
            photo_id=photo_id, transcript=transcript, facts=facts,
            open_questions=questions, error=error,
        )
        self.store.save_achievement(achievement, session_id, source_metadata,
                                    audio_path, _now())
        return achievement

    def get_achievement(self, session_id: str, achievement_id: str) -> Achievement:
        owner = self.store.achievement_session(achievement_id)
        a = self.store.get_achievement(achievement_id)
        if a is None or owner != session_id:
            raise not_found("achievement", achievement_id)
        return a

    def list_achievements(self, session_id: str) -> list[Achievement]:
        return self.store.list_achievements(session_id)

    def update_achievement(self, session_id: str, achievement_id: str,
                           req: UpdateAchievementRequest) -> Achievement:
        a = self.get_achievement(session_id, achievement_id)
        if req.revision != a.revision:
            raise revision_conflict("achievement", req.revision, a.revision)

        if "photo_id" in req.model_fields_set:
            if req.photo_id is None:
                a.photo_id = None
            else:
                self.media.resolve_photo(req.photo_id, session_id)
                a.photo_id = req.photo_id

        stored = {f.id: f for f in a.facts}
        facts: list[Fact] = []
        for f in req.facts:
            prev = stored.get(f.id)
            if prev and prev.source != "user" and prev.text == f.text:
                # Sin cambios de texto: conserva trazabilidad original.
                facts.append(Fact(id=f.id, category=f.category or prev.category,
                                  text=f.text, source_quote=prev.source_quote,
                                  source=prev.source))
            else:
                facts.append(Fact(id=f.id, category=f.category, text=f.text,
                                  source_quote=None, source="user"))
        a.facts = facts
        a.revision += 1
        if a.status in ("approved", "failed"):
            a.status = "needs_review"  # R4: editar un aprobado reabre revisión; R6: recuperación manual
            a.error = None
        self.store.save_achievement(a, session_id,
                                    self.store.achievement_source_metadata(a.id),
                                    self.store.achievement_audio_path(a.id), _now())
        return a

    def approve_achievement(self, session_id: str, achievement_id: str,
                            req: ApproveAchievementRequest) -> Achievement:
        a = self.get_achievement(session_id, achievement_id)
        if req.revision != a.revision:
            raise revision_conflict("achievement", req.revision, a.revision)
        if a.status == "approved":
            return a
        if a.status != "needs_review":
            raise invalid_state(
                f"El logro está en estado '{a.status}'; sólo se puede aprobar 'needs_review'.")
        a.status = "approved"
        self.store.save_achievement(a, session_id,
                                    self.store.achievement_source_metadata(a.id),
                                    self.store.achievement_audio_path(a.id), _now())
        return a

    # --- drafts ---

    def generate_drafts(self, session_id: str, achievement_id: str,
                        req: GenerateDraftsRequest) -> GenerateDraftsResponse:
        a = self.get_achievement(session_id, achievement_id)
        if req.achievement_revision != a.revision:
            raise revision_conflict("achievement", req.achievement_revision, a.revision)
        if a.status != "approved":
            raise invalid_state(
                f"El logro está en estado '{a.status}'; generar borradores exige 'approved' (R3).")

        voice = req.voice_context
        if voice is None:
            found = self.store.get_profile(session_id)
            if found and found[0].onboarding_status == "complete":
                voice = found[0].voice_context  # snapshot congelado del perfil

        drafts: list[Draft] = []
        for platform in dict.fromkeys(req.platforms):
            max_chars = MAX_CHARS[platform]
            try:
                body = self.llm.draft(platform=platform, facts=a.facts,
                                      voice=voice, max_chars=max_chars)
            except LLMError as e:
                raise ApiError(502, e.code, str(e), retryable=True) from e
            body = fit_to_limit(body, max_chars)
            prefix = "drf_li" if platform == "linkedin" else "drf_x"
            draft = Draft(
                id=new_id(prefix), achievement_id=a.id,
                achievement_revision=a.revision, platform=platform, revision=1,
                status="ready_to_publish", photo_id=a.photo_id, body=body,
                char_count=len(body), max_chars=max_chars,
                used_fact_ids=[f.id for f in a.facts],
            )
            self.store.save_draft(draft, session_id, _now())
            drafts.append(draft)
        return GenerateDraftsResponse(
            achievement_id=a.id, achievement_revision=a.revision, drafts=drafts)

    def get_draft(self, session_id: str, draft_id: str) -> Draft:
        owner = self.store.draft_session(draft_id)
        d = self.store.get_draft(draft_id)
        if d is None or owner != session_id:
            raise not_found("draft", draft_id)
        return d

    def update_draft(self, session_id: str, draft_id: str,
                     req: UpdateDraftRequest) -> Draft:
        d = self.get_draft(session_id, draft_id)
        if req.revision != d.revision:
            raise revision_conflict("draft", req.revision, d.revision)
        if len(req.body) > d.max_chars:
            raise bad_request(
                f"El texto excede {d.max_chars} caracteres para {d.platform} "
                f"({len(req.body)}).", code="body_too_long")
        if "photo_id" in req.model_fields_set:
            if req.photo_id is None:
                d.photo_id = None
            else:
                self.media.resolve_photo(req.photo_id, session_id)
                d.photo_id = req.photo_id
        d.body = req.body
        d.char_count = len(req.body)
        d.revision += 1
        self.store.save_draft(d, session_id, _now())
        return d

    # --- handoff #3 -> #5 (R7) ---

    def get_publishable_draft(self, draft_id: str,
                              expected_revision: int) -> PublishableDraft:
        """Contrato interno para api/social: función Python, sin sesión (server-to-server)."""
        d = self.store.get_draft(draft_id)
        if d is None:
            raise not_found("draft", draft_id)
        if expected_revision != d.revision:
            raise revision_conflict("draft", expected_revision, d.revision)
        media = None
        if d.photo_id:
            asset = self.media.resolve_photo(d.photo_id)
            media = {
                "photo_id": asset.photo_id,
                "mime_type": asset.mime_type,
                "local_path": self.media.local_path(d.photo_id) or "",
                "alt_text": asset.alt_text,
            }
        return PublishableDraft(
            draft_id=d.id, draft_revision=d.revision, platform=d.platform,
            body=d.body, media=media,
        )

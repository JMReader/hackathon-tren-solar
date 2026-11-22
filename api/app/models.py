from __future__ import annotations

from typing import Literal, TypedDict

from pydantic import BaseModel, ConfigDict, Field

Platform = Literal["linkedin", "x"]
InputType = Literal["text", "audio", "mcp"]
AchievementStatus = Literal["processing", "needs_review", "approved", "failed"]
FactCategory = Literal["project", "role", "tech", "impact", "date", "learning", "context"]
FactSource = Literal["transcript", "user", "mcp"]
DraftStatus = Literal["draft", "ready_to_publish", "publishing", "succeeded", "failed", "unknown"]

MAX_CHARS: dict[str, int] = {"linkedin": 3000, "x": 280}


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool


class ApiErrorBody(BaseModel):
    error: ErrorDetail


class MediaAsset(BaseModel):
    photo_id: str
    mime_type: str
    alt_text: str | None = None
    size_bytes: int | None = None


class Fact(BaseModel):
    id: str
    category: FactCategory | None = None
    text: str
    source_quote: str | None = None
    source: FactSource


class OpenQuestion(BaseModel):
    id: str
    field: str
    question: str


class Achievement(BaseModel):
    id: str
    input_type: InputType
    status: AchievementStatus
    revision: int = Field(ge=1)
    photo_id: str | None = None
    transcript: str
    facts: list[Fact]
    open_questions: list[OpenQuestion]
    error: ErrorDetail | None = None


class VoicePreferences(BaseModel):
    use_emojis: bool = False
    use_hashtags: bool = False


class SamplePosts(BaseModel):
    linkedin: list[str] = []
    x: list[str] = []


class VoiceContext(BaseModel):
    """Datos de estilo/tono del autor. Nunca fuente de hechos (R2)."""

    model_config = ConfigDict(extra="ignore")

    language: str = "es-AR"
    author_hint: str | None = None
    sample_posts: SamplePosts | None = None
    preferences: VoicePreferences | None = None


class Draft(BaseModel):
    id: str
    achievement_id: str
    achievement_revision: int
    platform: Platform
    revision: int = Field(ge=1)
    status: DraftStatus
    photo_id: str | None = None
    body: str
    char_count: int
    max_chars: int
    used_fact_ids: list[str] = []


class PublishableMedia(TypedDict):
    photo_id: str
    mime_type: str
    local_path: str
    alt_text: str | None


class PublishableDraft(TypedDict):
    """Handoff interno #3 -> #5 (ver contracts/README.md y fixture 06)."""

    draft_id: str
    draft_revision: int
    platform: Platform
    body: str
    media: PublishableMedia | None


# --- Requests / responses ---


class CreateAchievementTextRequest(BaseModel):
    input_type: Literal["text", "mcp"] = "text"
    text: str = Field(min_length=10)
    photo_id: str | None = None
    source_metadata: dict | None = None


class UpdateAchievementRequest(BaseModel):
    revision: int = Field(ge=1)
    photo_id: str | None = None
    facts: list[Fact]


class ApproveAchievementRequest(BaseModel):
    revision: int = Field(ge=1)
    add_to_portfolio: bool = False


class GenerateDraftsRequest(BaseModel):
    achievement_revision: int = Field(ge=1)
    platforms: list[Platform] = ["linkedin", "x"]
    voice_context: VoiceContext | None = None


class GenerateDraftsResponse(BaseModel):
    achievement_id: str
    achievement_revision: int
    drafts: list[Draft]


class UpdateDraftRequest(BaseModel):
    revision: int = Field(ge=1)
    body: str = Field(min_length=1)
    photo_id: str | None = None


# --- Sesión anónima y onboarding de autor (decisión 2026-11-22) ---

OnboardingStatus = Literal["not_started", "in_progress", "complete"]
StyleSyncStatus = Literal["skipped", "succeeded", "unavailable", "failed"]


class SessionCreated(BaseModel):
    session_id: str
    expires_at: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    session_id: str
    display_name: str


class CvDocument(BaseModel):
    cv_id: str
    mime_type: str
    size_bytes: int | None = None


class StyleSyncResult(BaseModel):
    status: StyleSyncStatus
    posts_imported: int = Field(ge=0)
    message: str | None = None


class StyleSync(BaseModel):
    last_attempt_at: str | None = None
    linkedin: StyleSyncResult
    x: StyleSyncResult


class AuthorProfile(BaseModel):
    session_id: str
    onboarding_status: OnboardingStatus
    revision: int = Field(ge=1)
    ready_for_achievement: bool
    profession: str | None = None
    photo_id: str | None = None
    writing_sample: str | None = None
    cv_document: CvDocument | None = None
    voice_context: VoiceContext | None = None
    style_sync: StyleSync


class UpdateAuthorProfileRequest(BaseModel):
    revision: int = Field(ge=1)
    profession: str | None = Field(default=None, min_length=2)
    writing_sample: str | None = None


class SetAuthorProfilePhotoRequest(BaseModel):
    revision: int = Field(ge=1)
    photo_id: str


class SyncStyleRequest(BaseModel):
    platforms: list[Platform] = ["linkedin", "x"]
    max_posts_per_platform: int = Field(default=5, ge=1, le=20)
    linkedin_profile_url: str | None = Field(default=None, max_length=300)


class CompleteOnboardingRequest(BaseModel):
    revision: int = Field(ge=1)


# --- Resultados internos de puertos (no son API) ---


class ExtractedFact(BaseModel):
    category: FactCategory | None = None
    text: str
    source_quote: str | None = None


class ExtractedQuestion(BaseModel):
    field: str
    question: str


class ExtractionResult(BaseModel):
    facts: list[ExtractedFact]
    open_questions: list[ExtractedQuestion]

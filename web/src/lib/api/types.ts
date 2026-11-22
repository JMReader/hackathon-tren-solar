export type Platform = "linkedin" | "x"

export type OnboardingStatus = "not_started" | "in_progress" | "complete"

export type ConnectionState =
  | "connected"
  | "disconnected"
  | "expired"
  | "access_unavailable"

export interface SessionCreated {
  session_id: string
  expires_at: string
}

export interface CvDocument {
  cv_id: string
  mime_type: string
  size_bytes?: number | null
}

export interface StyleSyncResult {
  status: "skipped" | "succeeded" | "unavailable" | "failed"
  posts_imported: number
  message?: string | null
}

export interface VoiceContext {
  language?: string
  author_hint?: string | null
  sample_posts?: {
    linkedin?: string[]
    x?: string[]
  }
  preferences?: {
    use_emojis?: boolean
    use_hashtags?: boolean
  }
}

export interface AuthorProfile {
  session_id: string
  onboarding_status: OnboardingStatus
  revision: number
  ready_for_achievement: boolean
  profession: string | null
  photo_id: string | null
  writing_sample: string | null
  cv_document: CvDocument | null
  voice_context: VoiceContext | null
  style_sync: {
    last_attempt_at: string | null
    linkedin: StyleSyncResult
    x: StyleSyncResult
  }
}

export interface UpdateAuthorProfileRequest {
  revision: number
  profession?: string | null
  writing_sample?: string | null
}

export interface SetAuthorProfilePhotoRequest {
  revision: number
  photo_id: string
}

export interface SyncStyleRequest {
  platforms?: Platform[]
  max_posts_per_platform?: number
  linkedin_profile_url?: string | null
}

export interface CompleteOnboardingRequest {
  revision: number
}

export interface MediaAsset {
  photo_id: string
  mime_type: string
  alt_text?: string | null
  size_bytes?: number | null
}

export interface SocialConnectionStatus {
  platform: Platform
  status: ConnectionState
  can_publish_text: boolean
  can_publish_image: boolean
  can_read_posts: boolean
  account_handle?: string | null
  reason?: string | null
}

export interface StartSocialConnectionResponse {
  platform: Platform
  authorization_url: string
  state: string
}

export type AchievementStatus = "processing" | "needs_review" | "approved" | "failed"

export type FactCategory =
  | "project"
  | "role"
  | "tech"
  | "impact"
  | "date"
  | "learning"
  | "context"

export interface Fact {
  id: string
  category?: FactCategory | null
  text: string
  source_quote?: string | null
  source: "transcript" | "user" | "mcp"
}

export type AchievementFact = Fact

export interface OpenQuestion {
  id: string
  field: string
  question: string
}

export interface Achievement {
  id: string
  input_type: "text" | "audio" | "mcp"
  status: AchievementStatus
  revision: number
  photo_id: string | null
  transcript: string
  facts: Fact[]
  open_questions: OpenQuestion[]
  error: ErrorDetail | null
}

export type DraftStatus =
  | "draft"
  | "ready_to_publish"
  | "publishing"
  | "succeeded"
  | "failed"
  | "unknown"

export interface Draft {
  id: string
  achievement_id: string
  achievement_revision: number
  platform: Platform
  revision: number
  status: DraftStatus
  photo_id: string | null
  body: string
  char_count: number
  max_chars: number
  used_fact_ids: string[]
}

export interface GenerateDraftsResponse {
  achievement_id: string
  achievement_revision: number
  drafts: Draft[]
}

export type PublicationStatus = "publishing" | "succeeded" | "failed" | "unknown"

export interface Publication {
  id: string
  draft_id: string
  draft_revision: number
  platform: Platform
  idempotency_key: string
  status: PublicationStatus
  external_post_id?: string | null
  external_url?: string | null
  published_at?: string | null
  error?: ErrorDetail | null
}

export interface AssistedShare {
  draft_id: string
  draft_revision: number
  platform: Platform
  text: string
  photo_id: string | null
  composer_url: string
  official: boolean
  attaches_photo: boolean
  notice: string
}

export interface ErrorDetail {
  code: string
  message: string
  retryable: boolean
}

export interface ApiError {
  error: ErrorDetail
}

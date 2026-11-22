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

export type AchievementStatus = "processing" | "needs_review" | "approved" | "failed"

export interface AchievementFact {
  id: string
  category?: string | null
  text: string
  source_quote?: string | null
  source: string
}

export interface Achievement {
  id: string
  input_type: string
  status: AchievementStatus
  revision: number
  photo_id?: string | null
  transcript: string
  facts: AchievementFact[]
  open_questions: { id: string; field: string; question: string }[]
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

export interface ErrorDetail {
  code: string
  message: string
  retryable: boolean
}

export interface ApiError {
  error: ErrorDetail
}

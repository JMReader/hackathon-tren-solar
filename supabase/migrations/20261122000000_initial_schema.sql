CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.author_profiles (
    session_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    onboarding_status TEXT NOT NULL,
    profession TEXT,
    photo_id TEXT,
    writing_sample TEXT,
    cv_id TEXT,
    sample_posts TEXT NOT NULL,
    voice_context TEXT,
    style_sync TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cv_documents (
    cv_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER,
    local_path TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.media (
    photo_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    alt_text TEXT,
    size_bytes INTEGER,
    local_path TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    input_type TEXT NOT NULL,
    status TEXT NOT NULL,
    revision INTEGER NOT NULL,
    photo_id TEXT,
    transcript TEXT NOT NULL,
    facts TEXT NOT NULL,
    open_questions TEXT NOT NULL,
    error TEXT,
    source_metadata TEXT,
    audio_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.drafts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    achievement_revision INTEGER NOT NULL,
    platform TEXT NOT NULL,
    revision INTEGER NOT NULL,
    status TEXT NOT NULL,
    photo_id TEXT,
    body TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    max_chars INTEGER NOT NULL,
    used_fact_ids TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.social_connections (
    owner_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    encrypted_token BYTEA NOT NULL,
    scopes TEXT NOT NULL,
    expires_at TEXT,
    account_id TEXT,
    account_handle TEXT,
    PRIMARY KEY (owner_id, platform)
);

CREATE TABLE IF NOT EXISTS public.social_publications (
    seq BIGSERIAL NOT NULL,
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    draft_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    publication TEXT NOT NULL,
    UNIQUE (owner_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.social_oauth_states (
    state TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    return_to TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_session ON public.media (session_id);
CREATE INDEX IF NOT EXISTS idx_achievements_session ON public.achievements (session_id);
CREATE INDEX IF NOT EXISTS idx_drafts_session ON public.drafts (session_id);
CREATE INDEX IF NOT EXISTS idx_drafts_achievement ON public.drafts (achievement_id);
CREATE INDEX IF NOT EXISTS social_publications_by_draft ON public.social_publications (owner_id, draft_id, seq DESC);
CREATE INDEX IF NOT EXISTS idx_social_oauth_states_expires ON public.social_oauth_states (expires_at);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', false, 26214400)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

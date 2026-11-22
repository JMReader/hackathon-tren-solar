-- Empresas: perfiles candidatos, consentimiento, búsquedas y contacto (#9–#12)

CREATE TABLE IF NOT EXISTS candidate_profiles (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT,
    industry TEXT,
    location TEXT,
    province TEXT DEFAULT 'Jujuy',
    country TEXT DEFAULT 'Argentina',
    segment TEXT,
    work_mode TEXT CHECK (work_mode IN ('onsite', 'hybrid', 'remote')),
    declared_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_synthetic BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS discovery_consents (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    shared_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    share_portfolio BOOLEAN NOT NULL DEFAULT FALSE,
    share_linkedin BOOLEAN NOT NULL DEFAULT FALSE,
    share_x BOOLEAN NOT NULL DEFAULT FALSE,
    publications_last_7_days INTEGER,
    linkedin_url TEXT,
    x_url TEXT,
    revoked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
    plan_expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS employer_searches (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    required_skills JSONB NOT NULL,
    industry TEXT,
    location TEXT,
    province TEXT DEFAULT 'Jujuy',
    country TEXT DEFAULT 'Argentina',
    work_mode TEXT CHECK (work_mode IN ('onsite', 'hybrid', 'remote')),
    job_proposal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_requests (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL REFERENCES employers(id),
    search_id TEXT NOT NULL REFERENCES employer_searches(id),
    candidate_session_id TEXT NOT NULL REFERENCES sessions(id),
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.portfolios (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    revision INTEGER NOT NULL,
    display_name TEXT NOT NULL,
    headline TEXT,
    items TEXT NOT NULL,
    template_id TEXT NOT NULL,
    palette_id TEXT NOT NULL,
    cv_downloadable BOOLEAN NOT NULL DEFAULT false,
    slug TEXT UNIQUE,
    published_revision INTEGER,
    published_snapshot TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pro_interest_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    response TEXT NOT NULL,
    trigger TEXT,
    item_id TEXT,
    price_band_ars_month TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolios_session ON public.portfolios (session_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_slug ON public.portfolios (slug);
CREATE INDEX IF NOT EXISTS idx_pro_interest_session ON public.pro_interest_events (session_id);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_interest_events ENABLE ROW LEVEL SECURITY;
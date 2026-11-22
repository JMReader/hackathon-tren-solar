-- X (OAuth 2.0 con offline.access) entrega un refresh token; se guarda cifrado igual que el access token.
ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS encrypted_refresh_token BYTEA;

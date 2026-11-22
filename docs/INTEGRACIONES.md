# Integraciones — guía operativa

Estado al 2026-11-22. Todas las claves van **sólo** en `api/.env` (local) y Vercel env vars (prod). Nunca en git.

## Proveedores

### LLM (extracción de hechos + drafts)

| Provider | Env | Modelo default | Notas |
|---|---|---|---|
| xAI Grok | `XAI_API_KEY` | `grok-4.7` | `auto` lo prefiere si está |
| Google Gemini | `GEMINI_API_KEY` | `gemini-3-flash-preview` | |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` | también sirve para Whisper |
| Groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | |

Forzar uno: `LLM_PROVIDER=openai|gemini|groq|xai|fake`. Modelo: `*_MODEL` correspondiente.

### STT (audio → transcript)

| Provider | Env | Modelo | Notas |
|---|---|---|---|
| **ElevenLabs Scribe** | `ELEVENLABS_API_KEY` | `scribe_v3` (`ELEVENLABS_MODEL`) | `auto` lo prefiere. `language_code` |
| OpenAI Whisper | `OPENAI_API_KEY` | `whisper-1` (`WHISPER_MODEL`) | `language` |

- `STT_PROVIDER=elevenlabs|whisper|fake`, `STT_LANGUAGE=es` (default) — el hint de idioma es lo que evita errores tipo "jacatón" en audio español con inglés mezclado.
- Endpoint usado: `POST /achievements` multipart `audio` (+`photo`/`text` opcional), máx 25 MB.

## Social OAuth + publicación

| | LinkedIn | X |
|---|---|---|
| Client | `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | `X_CLIENT_ID` / `X_CLIENT_SECRET` |
| Redirect | `LINKEDIN_REDIRECT_URI` → `/api/v1/social/linkedin/callback` | `X_REDIRECT_URI` → `/api/v1/social/x/callback` |
| Otros | `LINKEDIN_API_VERSION` (opcional) | `X_ALLOW_LINKS=0` (bloquea posts con links para no pagar URL-rate) |
| Tokens | access token, expira | access + **refresh token rotatorio cifrado** (`encrypted_refresh_token`) |

- `SOCIAL_TOKEN_KEY` (Fernet) cifra tokens en DB. **Obligatoria** en prod (si falta, se genera una por proceso → tokens ilegibles entre instancias).
- `SOCIAL_WEB_BASE_URL` = base del front para el redirect post-OAuth (`{base}{return_to}?social=…&result=connected|error`).
- Registrar los callbacks exactos en las apps de cada provider (local **y** prod).
- X usa OAuth2 + PKCE (`tweet.read tweet.write users.read media.write offline.access`); LinkedIn `openid profile w_member_social`.

## Persistencia

| Pieza | Env | Fallback |
|---|---|---|
| Postgres (Supabase) | `POSTGRES_URL` | SQLite `api/.data/` |
| Storage media/CV/audio | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | filesystem `api/.data/media` |

- Bucket `media` **privado**. Service role sólo server-side.
- `POSTGRES_URL` de `vercel env pull` trae `?supa=base-pooler.x` inválido para psycopg → para conexión directa usar `POSTGRES_URL_NON_POOLING` o sacar el param.
- Migraciones: `supabase/migrations/` — se aplican a mano por conexión directa (CLI sin login).

## MCP

- `python -m app.mcp_server` (stdio) — 6 tools del core. Config de ejemplo en `.cursor/mcp.json` (paths locales, no commitear).
- Comparte servicios/DB del backend pero sesión propia — no ve la sesión del browser.

## Front

- `NEXT_PUBLIC_API_URL` — `/api/v1` en prod (mismo dominio), `http://localhost:8000/api/v1` en dev contra el backend local.
- `web/src/app/api/v1/*` son mocks de Next para dev sin backend; en prod el rewrite `/api/*` los esquiva y va al FastAPI real.
- Vistas de publicación/drafts: en construcción por Mauro (hoy existen landing, onboarding 3 pasos, portfolio).

## Vercel

- Deploys bloqueados si el autor del commit no es cuenta GitHub con acceso → commitear con noreply (`80925718+JMReader@users.noreply.github.com` para Juan).
- Agregar/editar envs **después** de un deploy requiere redeploy para tomarlas.
- Preview deploys llevan Vercel Authentication; production es público.

# api/ — Motor modular Issue #3

Backend FastAPI: sesión anónima + onboarding de autor, ingesta modular
(`text` / `audio` / `mcp`), extracción de hechos con citas, revisión/aprobación
y borradores independientes LinkedIn/X. Contrato: `../contracts/openapi.yaml`.

## Correr

```bash
cd api
python3 -m venv .venv && .venv/bin/pip install fastapi "uvicorn[standard]" \
  python-multipart httpx pydantic mcp pytest pyyaml jsonschema
.venv/bin/uvicorn app.main:app --port 8000        # o: .venv/bin/python -m app.main
```

API en `http://localhost:8000/api/v1`. Integración con el front (#4): `../docs/INTEGRACION-FRONT.md`. Tests: `.venv/bin/python -m pytest tests`.

## Flujo (HTTP)

```bash
POST /session                          # -> session_id (sin password)
PATCH /session/profile                 # profession (oblig.), writing_sample>=20
POST  /media                           # foto privada -> photo_id
PUT   /session/profile/photo           # asociar foto al perfil
POST  /session/profile/sync-style      # importa posts si #5 habilita lectura
POST  /session/cv                      # opcional (PDF; portfolio #6)
POST  /session/profile/complete        # congela voice_context del autor
POST  /achievements                    # text|mcp JSON o multipart audio+foto
GET/PATCH /achievements/{id}           # revisión de hechos (409 si revision vieja)
POST  /achievements/{id}/approve       # congela revisión
POST  /achievements/{id}/drafts        # borradores LI/X (voice_context opcional:
                                       # si se omite usa el snapshot del perfil)
GET/PATCH /drafts/{id}                 # edición independiente por red
```

### Empresas (#9–#12, demo sintético)

```bash
export TS_ALLOW_SEED=1
export TS_EMPLOYER_DEMO=1
python -m scripts.seed && python -m scripts.seed --list
```

```bash
# Plan free: solo conteo
curl -H 'X-Employer-Id: seed_emp_free' -H 'Content-Type: application/json' \
  -d '{"title":"UX React","required_skills":["React"]}' \
  http://localhost:8000/api/v1/employer/searches
curl -H 'X-Employer-Id: seed_emp_free' \
  http://localhost:8000/api/v1/employer/searches/{id}/matches

# Plan pago: hasta cinco fichas con evidencia
curl -H 'X-Employer-Id: seed_emp_paid' ...
```

Rutas: `POST/DELETE /discovery/consent` (candidato, `X-Session-Id`),
`POST /employer/searches`, `GET /employer/searches/{id}/matches`,
`POST /contact-requests`, `GET/PATCH /contact-requests/{id}`.
Empresas usan `X-Employer-Id` (sólo `seed_emp_*` con `TS_EMPLOYER_DEMO=1`).
Las fichas devuelven `candidate_id` opaco, nunca `session_id`. Detalle en `../contracts/seed/README.md`.

Todo salvo `POST /session` exige header `X-Session-Id`. Recursos aislados por
sesión (otra sesión → 404). Errores siempre `{"error": {code, message, retryable}}`.

## Variables de entorno

Podés exportarlas o guardarlas en `api/.env` (gitignored; env real gana sobre el archivo):

```bash
echo 'XAI_API_KEY="xai-..."' >> api/.env   # o OPENAI_API_KEY / GEMINI_API_KEY / GROQ_API_KEY
```

| Var | Default | Para qué |
|---|---|---|
| `LLM_PROVIDER` | `auto` | `fake` en tests; `auto` elige la primera key presente |
| `GEMINI_API_KEY` | — | Provider real (`GEMINI_MODEL`, default `gemini-3-flash-preview`) |
| `OPENAI_API_KEY` | — | Chat JSON mode (`OPENAI_MODEL` `gpt-4o-mini`) y Whisper STT |
| `GROQ_API_KEY` | — | `GROQ_MODEL` `llama-3.3-70b-versatile` |
| `XAI_API_KEY` | — | `XAI_MODEL` `grok-4.7` (api.x.ai, OpenAI-compatible) |
| `STT_PROVIDER` | `auto` | `whisper` (requiere `OPENAI_API_KEY`) o `fake` |
| `WHISPER_MODEL` | `whisper-1` | Modelo STT de OpenAI |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Orígenes del front permitidos (coma-separados) |
| `SESSION_TTL_HOURS` | `24` | Expiración de sesión anónima |
| `TS_DATA_DIR` | `api/.data` | SQLite + media privada (nunca servida estática) |
| `FAKE_TRANSCRIPT` | — | Texto que devuelve `FakeTranscriber` |
| `FAKE_STYLE_POSTS` | — | JSON `{linkedin:[...], x:[...]}` para el style reader fake |

Sin keys todo corre verde con `FakeLLM`/`FakeTranscriber`.

## Entrypoints

- `python -m app.entrypoints.cli_e2e` — flujo completo onboarding→drafts→handoff.
- `python -m app.mcp_server` — server MCP por stdio con tools
  `ingest_achievement`, `get_achievement`, `update_achievement`,
  `approve_achievement`, `generate_drafts`, `get_publishable_draft`.

## Handoff #3 → #5

```python
from app.service import CoreService
pub: PublishableDraft = core.get_publishable_draft(draft_id, expected_revision)
# 409 ApiError si la revisión no coincide; media.local_path es ruta privada local
```

## Reglas de dominio

R1 cero invención (hechos con `source_quote` verificable en transcript; ediciones
→ `source="user"`; afirmaciones sin respaldo → `open_questions`). R2 estilo≠hechos.
R3 drafts exigen `approved` + revisión coincidente. R4 revisiones optimistas
independientes (editar aprobado → `needs_review`; editar X no toca LI). R5
LinkedIn≤3000 sin clichés, X≤280 con compresión automática. R6 fallas
`failed`+`retryable` preservando archivos; media privada. R7 `PublishableDraft`.

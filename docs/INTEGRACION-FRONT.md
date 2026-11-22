# Integración front (#4) ↔ backend (#3)

**Estado:** 2026-11-22, rama `juan/issue-3-backend`. Contrato: `contracts/openapi.yaml` + `contracts/fixtures/`.
**Para:** Mauro (`web/`). Reemplaza el mock de route handlers Next por el FastAPI real.

## 1. Levantar el backend

```bash
cd api
python3 -m venv .venv && .venv/bin/pip install fastapi "uvicorn[standard]" \
  python-multipart httpx pydantic mcp pytest pyyaml jsonschema
.venv/bin/uvicorn app.main:app --port 8000
```

- Base URL: `http://localhost:8000/api/v1`. Docs interactivas: `http://localhost:8000/docs`.
- Sin API keys corre con `FakeLLM`/`FakeTranscriber` (respuestas deterministas, sirven para la demo de UI).
  Con `GEMINI_API_KEY` (u `OPENAI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`) en `api/.env` usa LLM real.
- CORS: por defecto acepta `http://localhost:3000` y `http://127.0.0.1:3000`.
  Otro origen (deploy, otro puerto): `CORS_ORIGINS="https://mi-front.app,http://localhost:3001"`.

En `web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Con eso el `apiFetch` actual (header `X-Session-Id` desde localStorage) apunta al backend real.
Los route handlers mock de `web/src/app/api/v1/*` dejan de usarse; conviene borrarlos o dejarlos sólo como fallback.

## 2. Sesión

- `POST /session` → `{session_id, expires_at}` (fixture `09`). Guardar `session_id`.
- **Todas** las demás rutas exigen `X-Session-Id`. Sin header → 401 `session_missing`;
  id desconocido → 401 `session_invalid`; vencido (24 h) → 401 `session_expired`.
  Ante cualquier 401: crear sesión nueva y reiniciar onboarding (no hay migración).
- Los recursos están aislados por sesión: un id de otra sesión responde 404.

## 3. Onboarding (pantalla aprobada)

| Paso | Llamada | Notas |
|---|---|---|
| Foto | `POST /media` (multipart `file`, opcional `alt_text`) → `photo_id` | jpeg/png/webp/gif ≤ 10 MB; si no, 400 `unsupported_media_type` / `media_too_large` |
| Asociar foto | `PUT /session/profile/photo` `{revision, photo_id}` | foto de otra sesión → 404 |
| Profesión / muestra | `PATCH /session/profile` `{revision, profession?, writing_sample?}` | muestra < 20 chars → 400 `writing_sample_too_short` |
| Estilo desde redes | `POST /session/profile/sync-style` `{platforms?, max_posts_per_platform?}` | si ninguna red deja leer: **503 con `AuthorProfile`** (no `ApiError`); tratarlo como parcial y mostrar el textarea |
| CV (opcional) | `POST /session/cv` (multipart `file`: pdf/doc/docx/txt ≤ 10 MB) | no bloquea `complete` |
| Completar | `POST /session/profile/complete` `{revision}` | faltan campos → 400 `onboarding_requirements_missing` (el mensaje lista cuáles) |

- Cada mutación sube `revision`. Mandar siempre la última que devolvió el backend;
  si está vieja → 409 `profile_revision_conflict`: releer `GET /session/profile` y reintentar.
- Mostrar el paso de logro **sólo** si `ready_for_achievement === true` (fixture `11`).
  Requiere `onboarding_status == "complete"` + profesión + foto + estilo (muestra ≥ 20 o posts importados).
- La foto es privada: el backend no la sirve. Para la vista previa usar el `File` local (`URL.createObjectURL`).

## 4. Logro → revisión → borradores

1. `POST /achievements`
   - Texto: JSON `{input_type: "text", text (≥10), photo_id?}` (fixture `01`/`12`).
   - Audio + foto: multipart `audio`, `photo`, `text?`, `input_type=audio`.
   - Sin onboarding completo → **403 `onboarding_incomplete`**.
   - Respuesta: `Achievement` con `status: "needs_review"` (fixture `02`), o `"failed"` si falló STT/LLM (recuperable: reintentar o pasar a texto).
2. Revisión: `PATCH /achievements/{id}` `{revision, facts, photo_id?}`. Cada hecho trae `source_quote`; los editados por el usuario quedan con `source: "user"`. Editar un logro aprobado lo vuelve a `needs_review`.
3. `POST /achievements/{id}/approve` `{revision}` → `status: "approved"` (fixture `03`). Repetir con la misma revisión es idempotente.
4. `POST /achievements/{id}/drafts` `{achievement_revision, platforms: ["linkedin","x"]}` → 201 con un borrador por red (fixture `05`).
   - `voice_context` **se puede omitir**: el backend usa el snapshot del perfil. Si se envía, gana sobre el snapshot.
   - Logro no aprobado → 409 `invalid_state`. LLM caído → 502 `retryable: true`.
5. `GET/PATCH /drafts/{id}` `{revision, body, photo_id?}`: cada red se edita por separado. X se mantiene ≤ 280 caracteres.

## 5. Publicación (#5, Mayko)

Las rutas `/social/*` y `/drafts/{id}/publications` **no están montadas en esta rama**: llegan con el PR #15
(`mayko/5-integrar-app` → `juan/issue-3-backend`). Hasta que se mergee, el front puede seguir con el mock de
`/social/*` o mostrar el borrador con botón "copiar". Estado conocido: LinkedIn publica con OAuth real; X está
bloqueado por créditos (`access_unavailable`, publicación asistida).

## 6. Errores

Siempre `{"error": {"code", "message", "retryable"}}`.

| HTTP | Cuándo |
|---|---|
| 400 | regla de negocio o archivo inválido (`writing_sample_too_short`, `onboarding_requirements_missing`, `unsupported_media_type`, `media_too_large`, `missing_audio`, `missing_input`) |
| 401 | sesión ausente, inválida o vencida |
| 403 | `onboarding_incomplete` al crear logro |
| 404 | recurso inexistente o de otra sesión |
| 409 | revisión desactualizada (`revision_conflict`, `profile_revision_conflict`) o estado inválido (`invalid_state`) |
| 422 | payload que no cumple el schema (`validation_error`, ej. `text` < 10, `profession` < 2) |
| 502 | proveedor LLM/STT caído (`retryable: true`) |

## 7. Checklist de prueba rápida

```bash
S=$(curl -s -X POST localhost:8000/api/v1/session | python3 -c 'import sys,json;print(json.load(sys.stdin)["session_id"])')
curl -s localhost:8000/api/v1/session/profile -H "X-Session-Id: $S"
```

El flujo completo por código está en `api/app/entrypoints/cli_e2e.py`
(`cd api && .venv/bin/python -m app.entrypoints.cli_e2e`).

# Técnica — onboarding de pantalla

> **Carpeta:** `docs/features/onboarding/`.  
> **Alcance:** implementación de **`api/session`** (y tablas asociadas), middleware `X-Session-Id`, campo `can_read_posts` en contrato social, y enganche de `voice_context` al generar borradores.  
> **No es** la spec técnica del backend completo — ver `docs/spec-tecnica.md` y `contracts/openapi.yaml` (rutas no `/session`).

**Estado:** 2026-11-22. Contrato: tag `session` en `contracts/openapi.yaml`; fixtures `09`–`12`.

## Código que toca esta feature

```
api/
  session/
    router.py       # rutas /session/*
    service.py      # ready_for_achievement, build_voice_context, complete
    models.py       # AuthorProfile ORM
  ports/
    style_reader.py # Protocol — implementación real en #5 social
  middleware.py     # X-Session-Id (lista blanca: POST /session)
```

El resto de `api/` (achievements, drafts, social publish) se documenta en `spec-tecnica.md`; aquí solo el **cambio transversal**: esos recursos deben filtrar por `session_id`.

## Límites #3 ↔ #5 (solo estilo en onboarding)

| Pieza | Dueño | Nota |
| --- | --- | --- |
| `can_read_posts` en `SocialConnectionStatus` | #5 | Fixture `07` actualizado |
| `POST /session/profile/sync-style` | #3 orquesta | Llama `StyleReaderPort` |
| Tokens OAuth | #5 | #3 no lee tokens |

Sin implementación de lectura en #5: `StyleReaderPort` → `unavailable`; onboarding usa `writing_sample`.

## Tablas (solo onboarding)

- **sessions** — `id`, `created_at`, `expires_at`
- **author_profiles** — `session_id`, `revision`, `onboarding_status`, `profession`, `photo_id`, `writing_sample`, `cv_id`, `voice_context_json`, `style_sync_json`
- **cv_documents** — binario + metadatos (opcional)

`media_assets` ya existe (`POST /media`). No definir aquí esquema de achievements/drafts.

## Rutas (tag `session` en OpenAPI)

| Método | Ruta |
| --- | --- |
| POST | `/session` |
| GET/PATCH | `/session/profile` |
| PUT | `/session/profile/photo` |
| POST | `/session/cv` |
| POST | `/session/profile/sync-style` |
| POST | `/session/profile/complete` |

**Enganche único fuera de `/session`:** `POST /achievements` devuelve 403 si `!ready_for_achievement` (comportamiento de esta feature).

### `build_voice_context(profile)`

- `author_hint` ← `profession`
- `sample_posts` ← sync-style o vacío
- Si no hay posts: tono solo desde `writing_sample` (sin hechos nuevos)

### Errores propios de onboarding

| code | HTTP |
| --- | --- |
| `session_missing` / `session_expired` | 401 |
| `onboarding_incomplete` | 403 (solo al crear logro) |
| `profile_revision_conflict` | 409 |
| `onboarding_requirements_missing` | 400 |

## Seguridad (onboarding)

- TTL sesión: 24 h (`SESSION_TTL_HOURS`).
- CV y fotos en almacenamiento privado.
- Tokens: solo #5.

## Verificación (fixtures de esta feature)

| Fixture | Qué prueba |
| --- | --- |
| `09` | Crear sesión |
| `10` | Perfil incompleto |
| `11` | Complete + `voice_context` |
| `12` | Handoff: puede crear logro; drafts sin `voice_context` en body (comportamiento documentado en spec general) |

## Coordinación

Cambios en `AuthorProfile`, `VoiceContext` compartido o `can_read_posts` → avisar #4 y #5 antes de merge.
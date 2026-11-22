# Contratos compartidos — Issues #3, #4 y #5

Este directorio contiene la especificación OpenAPI (`openapi.yaml`) y los payloads JSON (`fixtures/`) para trabajar en paralelo sin bloquearnos por auth/signup ni onboarding.

## División rápida de endpoints (`/api/v1`)

### Issue #3 — Juan (Ingesta modular `text`/`audio`/`mcp` + Revisión + Borradores)
- `POST /media` — sube imagen privada opcional y devuelve `photo_id`.
- `POST /achievements` — crea logro desde texto (`input_type: "text"`), MCP (`"mcp"`) o multipart (`audio` + `photo`).
- `GET /achievements/{id}` — devuelve `transcript`, `facts[]`, `open_questions[]`, `revision` y `status`.
- `PATCH /achievements/{id}` — corrige hechos verificando `revision` (`409` si quedó desactualizada).
- `POST /achievements/{id}/approve` — congela una revisión aprobada.
- `POST /achievements/{id}/drafts` — genera dos `Draft` independientes (`linkedin` y `x`) usando sólo hechos aprobados + `voice_context` opcional (para imitar estilo del autor sin inventar hechos).
- `GET /drafts/{id}` y `PATCH /drafts/{id}` — lee y edita cada borrador por separado con su propio `revision`.

### Issue #5 — Mayko (OAuth LinkedIn/X + Publicación idempotente)
- `GET /social/{platform}/connection` — devuelve estado real (`connected`, `disconnected`, `expired`, `access_unavailable`) y capacidades (`can_publish_text`, `can_publish_image`).
- `POST /social/{platform}/connection` — inicia OAuth con `state` y scopes mínimos; devuelve `authorization_url` (o `503` con `access_unavailable` si el proveedor bloquea permisos).
- `GET /social/{platform}/callback` — recibe callback OAuth, cifra token en servidor y redirige al front.
- `POST /drafts/{id}/publications` — requiere header `Idempotency-Key` y body `{ "draft_revision": <int>, "confirm_publish": true }`.
- `GET /publications/{id}` — devuelve `status` (`publishing`, `succeeded`, `failed`, `unknown`), `external_post_id`, `external_url` y `error`.

### Handoff interno #3 → #5 (`PublishableDraft`)
Cuando `POST /drafts/{id}/publications` se ejecuta, el módulo de #3 le entrega al módulo `api/social` de Mayko un `PublishableDraft` ya validado contra `draft_revision` (ver ejemplo completo en `fixtures/06-handoff-publishable-draft-to-social.json`):

```python
class PublishableMedia(TypedDict):
    photo_id: str
    mime_type: str
    local_path: str
    alt_text: str | None

class PublishableDraft(TypedDict):
    draft_id: str
    draft_revision: int
    platform: Literal["linkedin", "x"]
    body: str
    media: PublishableMedia | None
```

Reglas críticas para #5:
1. **Idempotencia:** repetir `POST /drafts/{id}/publications` con la misma `Idempotency-Key` devuelve el mismo `Publication` sin volver a postear en la red.
2. **Timeout luego de enviar:** marcar `status = "unknown"` con `retryable = false` y pedir verificar en la red antes de otro intento.
3. **Sin permisos de API:** devolver `status = "access_unavailable"` en `/social/{platform}/connection` con la causa en `reason`. Nunca simular `succeeded` sin ID/enlace real del proveedor.

## Índice de fixtures (`contracts/fixtures/`)

1. `01-achievement-create-text.request.json` — Request `POST /achievements` (modo texto).
2. `02-achievement-needs-review.response.json` — Respuesta con hechos citados y preguntas abiertas.
3. `03-achievement-approved.response.json` — Estado tras `PATCH` + `POST /approve` (`revision: 2`).
4. `04-drafts-generate.request.json` — Request `POST /achievements/{id}/drafts` con `voice_context`.
5. `05-drafts-generated.response.json` — Los 2 borradores generados (`linkedin` y `x`).
6. `06-handoff-publishable-draft-to-social.json` — Payload interno `#3 -> #5` para Mayko (con foto y sólo texto).
7. `07-social-connections.response.json` — Estados de conexión (`connected` y `access_unavailable`).
8. `08-publications-states.response.json` — Request + respuestas `succeeded`, `unknown` y `failed`.

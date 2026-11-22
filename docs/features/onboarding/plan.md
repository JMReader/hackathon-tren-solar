# Plan — onboarding de pantalla

> **Carpeta:** `docs/features/onboarding/`.  
> **Alcance de este plan:** únicamente entregar la feature onboarding en `api/session` y el middleware de sesión (fixtures **09–11**, enganche 403 en `POST /achievements`).  
> **No incluye** el plan del motor de logros/borradores, publicación ni audio/MCP — ver `each_one/jmreader/notes/2026-11-22-spec-y-plan-issue-3.md` y `docs/spec-tecnica.md`.

**Referencias (esta carpeta):** [funcional.md](funcional.md), [tecnica.md](tecnica.md), `../../../contracts/openapi.yaml`, decisión cerebro `2026-11-22-onboarding-ui-aprobado.md`.

## Fase A — Middleware y sesión mínima

**Entregable:** `POST /session` en `:8000`.

- [ ] Middleware `X-Session-Id` (público solo `POST /session`).
- [ ] Tabla `sessions` + TTL.

**Verificación:** fixture `09`.

## Fase B — Perfil y complete

**Entregable:** fixtures `10` y `11` en tests.

- [ ] Tablas `author_profiles`, `cv_documents`.
- [ ] Rutas `GET/PATCH /session/profile`, `PUT .../photo`, `POST /session/cv`, `sync-style`, `complete`.
- [ ] `ready_for_achievement`, `build_voice_context`, tests OB-1–OB-6.
- [ ] `StyleReaderPort` **fake** (textos del fixture `11`).

**Verificación:** fixture `11`; `POST /achievements` sin complete → 403; con complete → 201 (fixture `12` como escenario E2E).

## Fase C — Integración #5 (lectura de posts)

**Entregable:** `sync-style` con implementación real de Mayko cuando exista.

- [ ] `can_read_posts` en status de conexión.
- [ ] `StyleReaderPort` productivo.

**Verificación:** con credenciales, posts importados; sin ellas, `unavailable` + textarea.

## Definition of Done (solo esta feature)

- Rutas `/session/*` alineadas con OpenAPI.
- Fixtures `09`–`11` pasan en CI o test local.
- Mauro (#4) puede construir la pantalla contra fixtures sin backend completo.
- Copia de contratos en cerebro `team/projects/hackathon-tren-solar/contracts/`.

## Fuera de este plan (otros documentos)

| Tema | Dónde |
| --- | --- |
| Logros, borradores, handoff publish | Nota Issue #3 + fixtures `01`–`06` |
| OAuth publicación | Issue #5, fixtures `07`–`08` |
| Audio / MCP | `spec-tecnica.md` corte posterior |

## Riesgos (onboarding)

| Riesgo | Mitigación |
| --- | --- |
| APIs sin lectura de posts | `writing_sample` obligatorio |
| Tiempo hackathon | Fase C opcional; fake en Fase B |
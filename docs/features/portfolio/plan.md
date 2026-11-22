# Plan — backend del portfolio y sus plantillas (#6)

> **Issue:** #22. **Rama sugerida:** `agente/portfolio-backend` desde `main`.
> **Alcance:** que las plantillas que ya existen en `web/src/portfolio/` se alimenten de datos reales del api (`api/app/`), en lugar de `demo.ts`.
> **No incluye:** cobro de Pro, plantillas pro funcionando, paleta desde imagen, seed (ver `docs/features/seed/plan.md`), vista de empresas.

## Estado de `main` (verificado el 22/11)

- El front ya tiene el editor (`/portfolio`), la página pública (`/p/[slug]`), 10 plantillas (5 `free` y 5 `pro` con candado) y 6 paletas en `web/src/portfolio/catalog.ts`. Todo funciona con `demo.ts` («Lucía Tolaba»).
- `web/src/portfolio/api.ts` llama a `${PORTFOLIO_API_URL}/p/{slug}` sólo si existe esa variable. El api **no tiene ninguna ruta de portfolio**.
- El fake door Pro hace `POST /api/v1/pro-interest`, y hoy lo responde una ruta de Next (`web/src/app/api/v1/pro-interest/route.ts`) que sólo hace `console.info`. En el deploy, `vercel.json` reescribe `/api/(.*)` al backend, así que probablemente esa ruta no se alcanza y da 404. Verificarlo.
- Persistencia: `Store` (SQLite) o `PostgresStore` (Supabase), según `POSTGRES_URL`. Media en `MediaStore` o `SupabaseMediaStore`. Migraciones en `supabase/migrations/`.
- Todas las rutas salvo `POST /session` exigen `X-Session-Id`, y los logros ya están aislados por sesión. El hueco 1 de la propuesta de Mauri ya no aplica.

## Fuente del contrato

Propuesta de Mauri, que Juan da por aprobada con este plan:
`hackathon-tren-solar-brain@f3cd818:each_one/mauri/artifacts/portfolio-contrato/`

- `openapi-portfolio.yaml`: fragmento para fusionar en `contracts/openapi.yaml`.
- `13-portfolio-catalog.response.json` y `14-public-portfolio.response.json`: copiar a `contracts/fixtures/`.

```bash
R=JMReader/hackathon-tren-solar-brain; P=each_one/mauri/artifacts/portfolio-contrato
for f in openapi-portfolio.yaml 13-portfolio-catalog.response.json 14-public-portfolio.response.json; do
  gh api "repos/$R/contents/$P/$f?ref=f3cd818" --jq .content | base64 -d > "/tmp/$f"
done
```

Decisiones de producto que este plan adopta, porque el front ya las implementa:
- 5 plantillas gratis y 5 pro con candado. Elegir una pro devuelve `422 pro_required`.
- CV obligatorio para publicar (`422 cv_required`) y privado salvo `cv_downloadable: true`.
- `display_name` y `title`/`occurred_on` por ítem viven en el portfolio, porque `AuthorProfile` y `Achievement` no los tienen.

## Fase A — Contrato

- [ ] Fusionar `openapi-portfolio.yaml` en `contracts/openapi.yaml` (tag `portfolio`), reusando `SessionId`, `Unauthorized`, `NotFound`, `RevisionConflict`, `FactCategory` y `FactSource`.
- [ ] Copiar los fixtures 13 y 14. Agregar `15-portfolio-draft.response.json` y `16-portfolio-published.response.json`.
- [ ] Sección «Issue #6 — Portfolio» en `contracts/README.md`.

**Verificación:** `tests/test_contract.py` valida 13–16 contra el schema.

## Fase B — Persistencia

- [ ] Migración nueva `supabase/migrations/20261122020000_portfolio.sql`:
  - `portfolios`: `id`, `session_id`, `status` (`draft|published|revoked`), `revision`, `display_name`, `headline`, `items` (JSON), `template_id`, `palette_id`, `cv_downloadable`, `slug` UNIQUE, `published_revision`, `published_snapshot` (JSON del `PublicPortfolio`), `published_at`, `created_at`, `updated_at`.
  - `pro_interest_events`: `id`, `session_id`, `response`, `trigger`, `item_id`, `price_band_ars_month`, `created_at`.
  - Activar RLS como el resto.
- [ ] Las mismas tablas en `Store` (SQLite, `CREATE TABLE IF NOT EXISTS`) y los métodos equivalentes en `PostgresStore`. Mantener la misma superficie en ambos.

**Verificación:** tests de repositorio contra SQLite. Postgres sólo si hay `POSTGRES_URL` local.

## Fase C — Servicio y rutas

Módulo nuevo `api/app/portfolio/` (`catalog.py`, `service.py`, `router.py`), montado en `create_app` con prefijo `/api/v1`.

- [ ] `catalog.py`: plantillas y paletas idénticas a `web/src/portfolio/catalog.ts`. El backend es la fuente de verdad del `tier`.
- [ ] `GET /portfolio/catalog` (público).
- [ ] `POST /portfolios`: todos los `achievement_id` deben ser de la sesión y estar `approved` (si no, `422 achievement_not_approved`; si son de otra sesión, `404`). Plantilla o paleta pro dan `422 pro_required`.
- [ ] `GET/PATCH /portfolios/{id}` con `revision` y `409` si quedó vieja, igual que logros y borradores.
- [ ] `POST /portfolios/{id}/publish`:
  - exige `confirm_public: true` (si no, `422`) y CV en el perfil (si no, `422 cv_required`);
  - genera el slug desde `display_name` si no viene, y responde `409` si está tomado;
  - **congela un snapshot** sólo con `category`, `text` y `source` de los hechos aprobados.
- [ ] `DELETE /portfolios/{id}/publish`: revoca y `/p/{slug}` pasa a 404. El borrador se conserva.
- [ ] `GET /p/{slug}` (público): devuelve el snapshot publicado. Nunca `transcript`, `source_quote`, audio, `session_id` ni fotos no elegidas.
- [ ] `GET /p/{slug}/media/{id}`: sólo si el id es la foto de perfil o una foto de ítem del snapshot (si no, 404). Lee con `MediaStore`.
- [ ] `GET /p/{slug}/cv`: sólo con `cv_downloadable`.
- [ ] `POST /pro-interest` → `202`. Guarda el evento y no pide email.

**Verificación:** tests nuevos en `api/tests/test_portfolio.py`:
- crear → editar → publicar → ver público → revocar → 404;
- 409 por revisión vieja;
- `pro_required`, `cv_required` y `achievement_not_approved`;
- un logro de otra sesión da 404;
- el snapshot no cambia si después se edita el borrador;
- `/p/{slug}` no filtra campos privados;
- media fuera del snapshot da 404.

## Fase D — Conectar el front

- [ ] `getPublicPortfolio` usa el api. En el server de Next hace falta una URL absoluta: definir `PORTFOLIO_API_URL` (local `http://localhost:8000/api/v1`) y documentarla en `web/README.md`.
- [ ] El editor (`/portfolio`) lee la sesión (`useSessionId`), lista los logros aprobados y crea o edita el portfolio en lugar de usar `demoPortfolio`. Si la sesión no tiene logros aprobados, muestra el demo con el badge «Datos de ejemplo», como hoy.
- [ ] Borrar `web/src/app/api/v1/pro-interest/route.ts` cuando el backend responda.
- [ ] `demo.ts` queda sólo como fallback sin api.

**Verificación:** con api local, un logro aprobado se publica y abre en `/p/{slug}` en las 5 plantillas gratis y las 6 paletas.

## Definition of Done

- `cd api && .venv/bin/pytest -q` en verde, incluidos los tests nuevos.
- `cd web && npm run lint && npm run build` en verde.
- OpenAPI y fixtures actualizados, y PR abierto contra `main` que referencia #22 y #6.

## Límites para el agente

- Escribir sólo en `api/app/portfolio/`, `api/app/db.py`, `api/app/db_postgres.py`, `api/app/main.py`, `api/tests/`, `supabase/migrations/`, `contracts/` y `web/src/portfolio/`, `web/src/app/portfolio/`, `web/src/app/p/`, `web/src/app/api/v1/pro-interest/`.
- No tocar el deploy, secretos ni el Supabase remoto. No correr migraciones contra producción.
- No implementar cobro, plantillas pro ni paleta desde imagen.
- Si una decisión de producto no está en este plan, frenar y dejar la pregunta en #22.

## Coordinación con el seed

El plan del seed (#18) siembra portfolios usando estas tablas. Cada agente agrega **su propia** migración con timestamp distinto. Si los dos tocan `db.py` y `db_postgres.py`, que cada uno agregue métodos en una sección propia, y rebasear contra `main` antes del PR.

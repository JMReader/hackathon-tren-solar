# Plan — seed de usuarios sintéticos (#18)

> **Issue:** #18 (análisis completo y matriz de cobertura). **Rama sugerida:** `agente/seed-usuarios` desde `main`.
> **Confirmado por Juan:** 12 candidatos y 3 empresas. Nombre, ubicación, modalidad y rubro en un `CandidateProfile` aparte.
> **Defaults mientras no se decida otra cosa:** sólo entornos locales (no el Supabase del deploy) y un único audio, `web/public/audio/demo-logro.m4a`.

## Fuente de verdad

1. Issue #18: qué sembrar, matriz de cobertura, reglas de datos sintéticos y aceptación.
2. `contracts/openapi.yaml` y `contracts/fixtures/` para la forma de cada entidad existente.
3. `supabase/migrations/*.sql` para las tablas.
4. `docs/sdd-empleadores-matching.md` para la forma de las entidades de empresa.
5. `docs/features/portfolio/plan.md` (#22) para las tablas de portfolio.

## Fase A — `CandidateProfile`

- [ ] Migración `supabase/migrations/20261122030000_candidate_profiles.sql`:
  - tabla `candidate_profiles` con `session_id` PK, `display_name`, `role`, `industry`, `location`, `work_mode` (`onsite|hybrid|remote`), `segment` (`digital_junior|mineria_industria`), `is_synthetic`, `created_at` y `updated_at`;
  - RLS activado.
- [ ] La misma tabla y métodos `save_candidate_profile` / `get_candidate_profile` en `Store` y `PostgresStore`.
- [ ] Sin rutas nuevas: la exposición es de #12.

**Verificación:** test de repositorio SQLite.

## Fase B — Datos

- [ ] `contracts/seed/candidates.json`: 12 personas, cada una con `session`, `author_profile`, `candidate_profile`, `media`, `cv`, `achievements[]`, `drafts[]`, `social_connections[]`, `publications[]`, `discovery_consent` y `portfolio`.
- [ ] `contracts/seed/employers.json`: 3 empresas (consultora verificada, equipo interno verificado y una no verificada) y 4 recruiters.
- [ ] `contracts/seed/searches.json` y `contracts/seed/contact_requests.json`, según #18.
- [ ] `contracts/seed/assets/`: 12 avatares generados o ilustraciones con licencia libre, y 4 o 5 CV PDF con la marca «DATOS DE DEMOSTRACIÓN».
- [ ] `contracts/seed/README.md`: tabla persona → casos de la matriz que cubre → URL del portfolio.

IDs fijos con prefijo `seed_` (`seed_ses_ana`, `seed_ach_ana_react`, slug `seed-ana-ux`). Emails `@example.com`. Todas las personas mayores de 18 y con `is_synthetic: true`.

**Verificación:** `api/tests/test_seed_data.py`:
- valida cada entidad existente contra `openapi.yaml`;
- falla si hay emails fuera de `example.com`, entidades sin `is_synthetic` o IDs sin `seed_`;
- comprueba que cada fila de la matriz de #18 tenga al menos una persona.

## Fase C — Loader

- [ ] `api/scripts/seed.py`, que se corre como `python -m scripts.seed` desde `api/`:
  - Arma `Services(Settings.from_env())` como `app.main`, así escribe con `Store`/`PostgresStore` y sube archivos con `MediaStore`/`SupabaseMediaStore` según el entorno. No usa SQL crudo salvo en `--reset`.
  - Sesiones con `expires_at` en 2099.
  - Conexiones `connected`: el token se cifra con `api/social/crypto.py` y su valor es falso.
  - Portfolios: si existen las tablas de #22 los crea y publica a través del servicio; si no, los omite con un aviso.
  - Empresas, búsquedas y contactos: sólo se validan (Fase 2 de #18). Se cargan cuando #11 y #12 creen las tablas.
- [ ] Flags: sin flags crea o actualiza; `--reset` borra sólo filas `seed_*` y archivos de esas personas y vuelve a cargar; `--list` imprime persona, `session_id`, casos y `/p/{slug}`.
- [ ] Guardas: exige `TS_ALLOW_SEED=1`. Si `POSTGRES_URL` no apunta a `localhost`/`127.0.0.1`, exige `--target=<host>` igual al host del DSN.
- [ ] No llama a LLM, STT ni APIs de LinkedIn/X.

**Verificación:** `api/tests/test_seed_loader.py` sobre SQLite temporal:
- seed dos veces deja el mismo conteo;
- `--reset` no borra una sesión creada por `POST /session`;
- `GET /session/profile` con `X-Session-Id: seed_ses_…` devuelve el estado esperado;
- sin `TS_ALLOW_SEED` sale con error.

## Fase D — Front

- [ ] `web/src/portfolio/demo.ts` importa los portfolios de `contracts/seed/candidates.json` y sigue funcionando sin api.
- [ ] Opcional: un selector «Entrar como persona demo» sólo en desarrollo (`process.env.NODE_ENV !== "production"`), que setea `tren-solar.session-id`.
- [ ] Un prototipo de #10 puede leer `employers.json` y `searches.json` directo.

## Definition of Done

- `cd api && .venv/bin/pytest -q` en verde.
- `cd web && npm run lint && npm run build` en verde.
- `TS_ALLOW_SEED=1 python -m scripts.seed && python -m scripts.seed --list` en local deja las 12 personas navegables.
- PR contra `main` que referencia #18, con la salida de `--list` en la descripción.

## Límites para el agente

- Escribir sólo en `contracts/seed/`, `api/scripts/`, `api/app/db.py`, `api/app/db_postgres.py`, `api/tests/`, `supabase/migrations/` y `web/src/portfolio/demo.ts` (más el selector opcional).
- No sembrar el Supabase del deploy ni tocar secretos.
- No usar fotos, nombres ni handles de personas reales, ni de la recruiter entrevistada.
- No crear tablas de empresa: son de #11 y #12.
- Si algo de la matriz de #18 no se puede representar con el esquema actual, documentarlo en #18 y seguir con el resto.

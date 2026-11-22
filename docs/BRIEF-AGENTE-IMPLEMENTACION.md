# Brief — agente implementación Hackathon Tren Solar API

**Repo:** `/Users/korita/hackathons/hackathon-tren-solar`  
**Rama de trabajo habitual:** `juan/issue-3-backend` (verificar con `git status`)  
**Código:** `api/` (FastAPI, SQLite, pytest)

## Fuente de verdad (leer en este orden)

1. **Contrato:** `contracts/openapi.yaml` + `contracts/fixtures/` + `contracts/README.md`
2. **Onboarding (SDD aislado):** `docs/features/onboarding/` (`funcional.md`, `tecnica.md`, `plan.md`)
3. **Producto general (no reimplementar desde cero si ya existe):** `docs/spec-funcional.md`, `docs/spec-tecnica.md`
4. **Motor #3 (reglas R1–R7):** cerebro `each_one/jmreader/notes/2026-11-22-spec-y-plan-issue-3.md` si accesible; si no, reglas en tests y OpenAPI

## Objetivo de esta corrida

1. **Implementación alineada al OpenAPI** en `api/` (sesión/onboarding + achievements/drafts/media ya esbozados).
2. **Toda la suite pytest en verde** (`cd api && .venv/bin/pytest -q`).
3. **Onboarding:** fixtures `09`–`12` comportamiento cubierto por tests (`tests/test_session_onboarding.py`).
4. **Motor:** fixtures `01`–`06` y tests existentes (`test_core_api.py`, `test_contract.py`, etc.).
5. **Sin scope creep:** no portfolio, no OAuth real LinkedIn/X (stubs/fake OK), Fase C onboarding opcional con `FakeStyleReader`.
6. **No commitear** salvo que el brief pida explícitamente commit; dejar cambios listos y listar archivos tocados.

## Estado conocido al redactar el brief (2026-11-22)

- `pytest`: **61 passed, 4 failed** — fallos en `tests/test_mcp_tools.py` (MCP `InvalidSignature` return type `dict` en herramientas).
- Existen `app/session_service.py`, `app/style_reader.py`, tests de onboarding.

## Checklist Definition of Done

- [ ] `pytest -q` → 0 failures
- [ ] `POST /achievements` sin onboarding complete → 403 `onboarding_incomplete`
- [ ] Rutas `/session/*` match OpenAPI (campos de `AuthorProfile`, revisiones, 409)
- [ ] `POST /achievements/{id}/drafts` sin `voice_context` usa perfil si onboarding complete
- [ ] Documentar en respuesta: qué faltaba, qué se cambió, comandos de verificación

## Comandos

```bash
cd /Users/korita/hackathons/hackathon-tren-solar/api
.venv/bin/pytest -q
.venv/bin/uvicorn app.main:app --reload --port 8000
```

## Fuera de alcance

- Frontend `web/`
- Deploy, secrets, Mayko OAuth producción
- Escribir en cerebro / git push
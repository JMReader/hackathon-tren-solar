# Seed sintético — demo empresas (#18)

12 candidatos en `candidates.json`. Empresas **Free** y **Pro** separadas. Territorio por defecto **Jujuy, Argentina**.

## Preview local

```bash
cd api
export TS_ALLOW_SEED=1
python -m scripts.seed
python -m scripts.seed --list
python -m scripts.seed --demo   # conteos Free vs Pro
.venv/bin/uvicorn app.main:app --port 8000
```

| Empresa | Header | Plan | Búsqueda demo |
|---------|--------|------|----------------|
| Empresa Free (demo) | `X-Employer-Id: seed_emp_free` | solo `eligible_count` | `seed_search_ux_jujuy_free` |
| Empresa Pro (demo) | `X-Employer-Id: seed_emp_paid` | hasta 5 fichas | `seed_search_ux_jujuy_paid` |

Misma consulta: **Diseño UX en Jujuy**, `required_skills: ["UX"]`, provincia Jujuy.

### Contrato de respuesta (`GET /employer/searches/{id}/matches`)

- **Free**: `{ employer_plan: "free", eligible_count: 5, matches: null }`
- **Pro**: `{ employer_plan: "paid", eligible_count: 5, matches: [ ...5 ] }` con evidencia, `portfolio_slug`, `publications_last_7_days` (puede ser `null`).

### Controles de la matriz (personas)

| Caso | Persona |
|------|---------|
| Sin consentimiento | Carla Méndez (`seed_ses_03_carla`) |
| Fuera de Jujuy (Córdoba) | Elías Costa |
| Remoto Argentina (entra) | Florencia Paz |
| Consentimiento revocado | Gustavo Núñez |
| Logro sin aprobar | Julia Arias |
| Minería (sin UX) | Helena Vega |

Los cinco elegibles en Jujuy con habilidad UX: Ana, Diana, Florencia (remoto), Kevin, Laura.

## curl rápido

```bash
curl -s -H 'X-Employer-Id: seed_emp_free' \
  http://localhost:8000/api/v1/employer/searches/seed_search_ux_jujuy_free/matches | jq '.eligible_count,.matches'

curl -s -H 'X-Employer-Id: seed_emp_paid' \
  http://localhost:8000/api/v1/employer/searches/seed_search_ux_jujuy_paid/matches | jq '.eligible_count, (.matches|length)'
```
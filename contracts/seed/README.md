# Seed sintético — demo empresas (#18)

100 candidatos `is_synthetic` en `candidates.json` (los 12 originales + 88 nuevos).
Empresas **Free** y **Pro** separadas. Territorio por defecto **Jujuy, Argentina**.

Distribución: ~70% Jujuy; el resto en Salta, Buenos Aires, Córdoba, Mendoza,
Tucumán y remoto global. Roles variados: UX/UI, frontend, backend, data,
marketing, community y producto (más algunos perfiles no digitales).

Cada perfil trae 3–6 skills con evidencia citada (frases concretas en
`evidence`, guardadas como `source_quote` del hecho), `achievement_title`,
`transcript`, `publications_last_7_days` y redes de ejemplo
(`linkedin.com/in/<slug>` y `x.com/<slug>` cuando `linkedin`/`x` están en true).

## Preview local

```bash
cd api
export TS_ALLOW_SEED=1
export TS_EMPLOYER_DEMO=1
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

- **Free**: `{ employer_plan: "free", eligible_count: 22, matches: null }`
- **Pro**: `{ employer_plan: "paid", eligible_count: 22, matches: [ ...5 ] }` con evidencia, `portfolio_slug`, `publications_last_7_days` (puede ser `null`).

Las 5 fichas Pro se mantienen estables para la demo: los perfiles originales
tienen `discovery_public_id` más bajo (`disc_01`–`disc_12`) y el desempate del
ranking los deja arriba. Los nuevos candidatos usan `seed_ses_e*` (`disc_e*`).

### Controles de la matriz (personas)

| Caso | Persona |
|------|---------|
| Sin consentimiento | Carla Méndez (`seed_ses_03_carla`), Matías Soria, Tomás Huanca, Javier Toledo |
| Fuera de Jujuy (Córdoba) | Elías Costa |
| Remoto Argentina (entra) | Florencia Paz + varios perfiles `remote` fuera de Jujuy |
| Consentimiento revocado | Gustavo Núñez, Maximiliano Sosa |
| Logro sin aprobar | Julia Arias, Silvina Zamora, Claudio Bazán |
| Minería (sin UX) | Helena Vega, Jazmín Funes |
| Turismo (sin UX) | Emiliano Giménez |
| Remoto global (no entra) | perfiles en Uruguay, Chile y México |

Los cinco elegibles estables en Jujuy con habilidad UX: Ana, Diana, Florencia
(remoto), Kevin, Laura. En total **22** perfiles elegibles para esa búsqueda.

## curl rápido

```bash
curl -s -H 'X-Employer-Id: seed_emp_free' \
  http://localhost:8000/api/v1/employer/searches/seed_search_ux_jujuy_free/matches | jq '.eligible_count,.matches'

curl -s -H 'X-Employer-Id: seed_emp_paid' \
  http://localhost:8000/api/v1/employer/searches/seed_search_ux_jujuy_paid/matches | jq '.eligible_count, (.matches|length)'
```

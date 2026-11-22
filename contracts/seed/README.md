# Seed sintético — demo empresas (#18)

Datos de demostración. **No usar en producción** ni contra Supabase desplegado sin `TS_ALLOW_SEED=1`.

| Empresa | Header `X-Employer-Id` | Plan |
|---------|----------------------|------|
| Norte Talent | `seed_emp_paid` | pago (hasta 5 fichas) |
| Consultora Piloto | `seed_emp_free` | gratis (solo conteo) |

## Arranque

```bash
cd api
export TS_ALLOW_SEED=1
python -m scripts.seed
python -m scripts.seed --list
```

Verificación del recorrido (#10):

1. `POST /api/v1/employer/searches` con `X-Employer-Id: seed_emp_free` y `required_skills: ["React"]`.
2. `GET .../matches` → `eligible_count` sin `matches`.
3. Repetir con `seed_emp_paid` → hasta cinco fichas con evidencia.
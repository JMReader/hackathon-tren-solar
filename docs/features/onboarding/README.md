# Feature: onboarding de pantalla

Esta carpeta contiene **solo** el SDD / specs de la feature **onboarding** (sesión anónima, perfil, estilo, CV opcional).

No documenta el motor de logros, borradores, publicación OAuth, audio ni MCP. Eso está en la raíz de `docs/` (`spec-funcional.md`, `spec-tecnica.md`) y en el cerebro (nota Issue #3).

| Documento | Contenido |
| --- | --- |
| [funcional.md](funcional.md) | Recorrido, criterios OB-*, fallas |
| [tecnica.md](tecnica.md) | `api/session`, tablas, contrato OpenAPI tag `session` |
| [plan.md](plan.md) | Fases A–C de implementación |

Contrato API: `contracts/openapi.yaml` (fixtures `09`–`12`). Decisión: cerebro `2026-11-22-onboarding-ui-aprobado.md`.
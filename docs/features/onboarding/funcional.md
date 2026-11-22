# Funcional — onboarding de pantalla

> **Carpeta:** `docs/features/onboarding/` — todo lo que vive aquí es SDD de onboarding, no del backend completo.  
> **Alcance de este documento:** solo la feature **onboarding** (sesión anónima, perfil del autor, muestra de estilo, CV opcional, `voice_context` congelado).  
> **No cubre** el motor de logros, borradores, publicación OAuth, audio, MCP ni portfolio. Eso sigue en `docs/spec-funcional.md`, `docs/spec-tecnica.md` y la nota Issue #3 en el cerebro.

**Estado:** vigente (2026-11-22). Decisión: `2026-11-22-onboarding-ui-aprobado.md` en el cerebro. UI: nota Mauro en `each_one/mauromamani/notes/2026-11-22-onboarding.md`.

## Actores (solo esta feature)

| Quién | Rol en onboarding |
| --- | --- |
| Autor | Completa pantalla previa; identificado por `X-Session-Id` |
| #3 Juan | Endpoints `/session/*`, reglas `ready_for_achievement`, snapshot `voice_context` |
| #4 Mauro | Pantalla UI; consume fixtures `09`–`11` |
| #5 Mayko | `can_read_posts` + adaptador para `POST /session/profile/sync-style` |

## Recorrido (onboarding únicamente)

1. `POST /session` → guardar `session_id` en el cliente.
2. Pantalla de entrada:
   - **Profesión** (obligatoria para `complete`).
   - **Foto:** `POST /media` + `PUT /session/profile/photo`.
   - **Redes (opcional):** OAuth existente; si hay lectura, `POST /session/profile/sync-style`.
   - **Muestra de escritura:** obligatoria si ninguna red aportó posts.
   - **CV (opcional):** `POST /session/cv` — guardado para portfolio #6, no bloquea.
3. `PATCH /session/profile` — profesión y/o muestra con `revision`.
4. `POST /session/profile/complete` — `onboarding_status = complete` y `voice_context` congelado.
5. Hasta `ready_for_achievement === true`, el front **no** muestra el paso de logro; el backend responde **403** en `POST /achievements` (`onboarding_incomplete`).

### Copy de confianza (solo referencia UI)

Textos de la nota de Mauro; el backend no los persiste.

## Qué cambia en el resto del producto (puntos de enganche)

Sin repetir el recorrido completo de `spec-funcional.md`:

- Rutas de logros/borradores exigen `X-Session-Id` (detalle en `spec-tecnica.md`).
- `POST /achievements/{id}/drafts` puede omitir `voice_context`; el servidor usa el snapshot del perfil si el onboarding está completo.
- Un `voice_context` explícito en el body **gana** sobre el snapshot (pruebas).

## Criterios de aceptación (solo onboarding)

| ID | Criterio |
| --- | --- |
| OB-1 | Sin `X-Session-Id` válido, rutas de sesión/perfil responden 401. |
| OB-2 | `ready_for_achievement` solo si `onboarding_status == complete` **y** hay `profession`, `photo_id` y fuente de estilo (muestra ≥ 20 chars **o** posts importados). |
| OB-3 | CV ausente no impide `complete`. |
| OB-4 | `sync-style` sin redes o sin `can_read_posts` no rompe el flujo; textarea sigue disponible. |
| OB-5 | Posts y textarea **no** crean `Fact` del logro automáticamente. |
| OB-6 | Cambios de perfil tras `complete` usan `revision` (409 si desfasada). |

## Fallas (solo onboarding)

| Situación | Comportamiento |
| --- | --- |
| Foto inválida en `/media` | 400; perfil sin cambio. |
| `revision` desactualizada | 409. |
| `complete` incompleto | 400 con campos pendientes. |
| Lectura de posts falla en una red | `style_sync` = `failed` en esa red; el resto sigue. |
| Sesión expirada | 401; nueva sesión (sin migración en hackathon). |

## Fuera de alcance de esta feature

Login/contraseña, portfolio público, motor factual R1–R7, publicación, audio y MCP.
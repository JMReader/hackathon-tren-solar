# Especificación técnica — Hackathon Tren Solar

## Stack y límites

Frontend en Next.js con TypeScript (`web/`). Backend en Python con FastAPI (`api/`) y contrato OpenAPI versionado en `contracts/openapi.yaml` junto con ejemplos ejecutables en `contracts/fixtures/`.

La ruta funcional soporta ingesta modular (`input_type`: `text`, `audio` o `mcp`) hacia un mismo núcleo de revisión y generación para LinkedIn y X:
- **Corte inmediato (E2E modular):** onboarding de pantalla con sesión anónima (`POST /session`) y perfil persistido; luego entrada por `text` (con `photo_id` opcional) + `voice_context` desde perfil o inline. Onboarding: carpeta `docs/features/onboarding/` (SDD aislado de esa feature).
- **Adaptadores siguientes sobre el mismo núcleo:** entrada por `audio` + foto desde móvil (transcripción STT hacia el mismo `transcript`) e integración `mcp` (consumir evidencia o exponer herramientas MCP sobre los mismos servicios de dominio).
- El portfolio y el CV siguen opcionales y fuera del primer corte. Pinterest se usa sólo como referencia visual del portfolio y nunca como destino de publicación.

## Contrato entre agentes

Fuente de verdad y ejemplos listos para consumir en paralelo:
- Especificación OpenAPI 3.1: `contracts/openapi.yaml`
- Guía rápida de integración (#3, #4 y #5) y payloads JSON: `contracts/README.md` y `contracts/fixtures/`

La API define `Achievement` con `id`, `input_type` (`text` | `audio` | `mcp`), `revision`, `transcript`, `facts[]`, `open_questions[]`, `status` (`processing` | `needs_review` | `approved` | `failed`) y `photo_id` (`string | null`).
Cada `Fact` tiene `id`, `category`, `text`, `source_quote` opcional y `source` (`transcript`, `user` o `mcp`). Las dudas o vacíos detectados quedan en `open_questions[]` y nunca se rellenan inventando datos.

La revisión aprobada (`status = approved` en una `revision` concreta) congela los hechos verificados y permite generar `Draft` independientes para `linkedin` y `x`.
Para imitar la voz del usuario sin depender aún de signup/onboarding, `POST /achievements/{id}/drafts` acepta un bloque opcional `voice_context` (`language`, `author_hint`, `sample_posts` por red y `preferences`), usado exclusivamente para estilo y nunca como fuente de hechos nuevos.
Cada `Draft` expone `id`, `achievement_id`, `achievement_revision`, `platform`, `body`, `char_count`, `max_chars`, `used_fact_ids[]`, `revision`, `photo_id` y `status` (`draft` | `ready_to_publish` | `publishing` | `succeeded` | `failed` | `unknown`). La API rechaza cualquier edición, aprobación o publicación sobre una `revision` desactualizada con HTTP 409.

Rutas bajo `/api/v1`:

- `POST /media` sube una foto privada opcional y devuelve `photo_id` y metadatos.
- `POST /achievements` acepta JSON (`input_type = text | mcp`, `text`, `photo_id` opcional) o `multipart/form-data` (`audio` + `photo` opcional), y devuelve `Achievement`.
- `GET /achievements/{id}` devuelve transcripción/texto normalizado, hechos, preguntas abiertas y estado.
- `PATCH /achievements/{id}` guarda correcciones de hechos validando `revision` (409 si quedó vieja).
- `POST /achievements/{id}/approve` aprueba una `revision` concreta.
- `POST /achievements/{id}/drafts` genera borradores separados (`linkedin`, `x`) desde la revisión aprobada + `voice_context` opcional.
- `GET/PATCH /drafts/{id}` lee y edita cada borrador de forma independiente validando su `revision`.
- `GET/POST /social/{platform}/connection` consulta estado de conexión (`connected` | `disconnected` | `expired` | `access_unavailable`) e inicia OAuth.
- `POST /drafts/{id}/publications` recibe confirmación explícita (`draft_revision`, `confirm_publish: true`) y header `Idempotency-Key`.
- `GET /publications/{id}` devuelve estado (`publishing` | `succeeded` | `failed` | `unknown`), `external_post_id`, `external_url` y detalle de error recuperable.
- `POST /portfolios`, `POST /style-preview` y `GET /p/{slug}` quedan reservados para el corte opcional de portfolio (#6).

### Handoff interno #3 → #5 (`PublishableDraft`)

Para desacoplar la generación (#3) de OAuth/publicación (#5, Mayko), el módulo #3 entrega a `api/social` un objeto `PublishableDraft` ya validado contra `draft_revision`:
- `draft_id`, `draft_revision`, `platform` (`linkedin` | `x`) y `body` definitivo confirmado por la persona.
- `media`: `{ photo_id, mime_type, local_path, alt_text }` o `null` cuando el post es sólo texto.

OpenAPI es la fuente del contrato. Los tipos del front se generan desde él y cada frente puede desarrollar contra `contracts/fixtures/`. Cambios de campos compartidos se coordinan antes de integrar PR.

## Publicación y fallas

Cada red tiene conexión, permiso y resultado independientes. La publicación requiere confirmación explícita del texto y foto final. El servidor guarda una clave de idempotencia por intento y conserva el resultado para responder a reintentos sin crear otro post. Un timeout luego de enviar se marca `unknown` y se concilia antes de permitir otro envío del mismo borrador. Sólo `succeeded` con identificador o enlace confirmado por el proveedor se muestra como publicado. Cuando la conexión o el acceso API no están disponibles, la UI conserva el borrador y ofrece copiar texto y conservar la foto para publicación manual.

Los adaptadores de LinkedIn y X usan APIs oficiales y OAuth de la cuenta. La disponibilidad y permisos se validan con cuentas de prueba antes de anunciar publicación directa. No se guardan tokens en el navegador ni el repositorio. Los errores se devuelven con código, mensaje y posibilidad de reintentar.

## Portfolio e inspiración

El portfolio reutiliza logros y fotos aprobados. Para crearlo se carga un CV válido y se elige Esencial o Galería. Un pin público de Pinterest o una imagen aportada por la persona puede orientar paleta y composición de estas plantillas. Si la referencia no se obtiene, se mantiene la plantilla elegida y se informa el problema. La vista previa antecede la publicación. El CV, audio, transcripción y fotos no elegidas siguen privados. La URL pública puede revocarse.

## Propiedad y archivos

- **Issue #3 (Juan):** dueño de `api/achievements`, `api/drafts`, ingesta modular (`text` / `audio` / `mcp`), extracción con citas, revisión/aprobación, `voice_context`, `contracts/openapi.yaml` y `contracts/fixtures/`.
- **Issue #4 (Mauro):** dueño de `web/` (`/crear`, revisión y vistas de publicación).
- **Issue #5 (Mayko):** dueño de `api/social`, OAuth, adaptadores oficiales de LinkedIn/X, cifrado de tokens, `Idempotency-Key` y estados de publicación, consumiendo `PublishableDraft` de #3 e integrando con #4 mediante el contrato.
- **Issue #6 (Mauri / corte posterior):** investigación de negocio y, si se aborda luego, `web/portfolio`, `api/portfolios` y `style-preview`.

Nadie modifica los archivos de otro issue sin coordinar el contrato.

En el primer corte hay sesión anónima sin contraseña y onboarding obligatorio antes de `POST /achievements`. Cada recurso valida `X-Session-Id` y pobla `voice_context` desde el perfil al generar borradores. Audio y archivos originales usan almacenamiento privado. La extracción cita el texto/audio cuando puede, marca incertidumbre y no inventa roles, fechas o impacto. Los tokens de redes se cifran y se guardan del lado servidor. El permiso para publicar en cada red y el permiso para hacer público un portfolio se piden por separado.

## Prueba integrada

En un teléfono, subir audio y foto, corregir un hecho, generar y editar ambos borradores y copiar cada uno. Con acceso API real, conectar una cuenta de prueba y publicar una vez, comprobando su enlace. Repetir la solicitud con la misma clave y comprobar que no duplica. Probar una falla de una red mientras la otra conserva su resultado. Crear un portfolio con CV, elegir plantilla, aplicar una referencia visual y abrir la URL pública en una sesión nueva. Completar el recorrido social sin crear portfolio.

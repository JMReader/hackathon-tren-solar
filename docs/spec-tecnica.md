# Especificación técnica — Hackathon Tren Solar

## Stack y límites

Frontend en Next.js con TypeScript. Backend en Python con FastAPI y contrato OpenAPI. La ruta principal usa audio y una foto para preparar publicaciones en LinkedIn y X. El portfolio es opcional. El CV se exige únicamente al crear un portfolio. Pinterest se usa como referencia visual del portfolio y nunca como destino de publicación en este alcance.

## Contrato entre agentes

La API define `Achievement` con `id`, `revision`, `transcript`, `facts[]`, `status` y `photo_id`. Cada `Fact` tiene `text`, `source_quote` opcional y `source` (`transcript` o `user`). La revisión aprobada genera `Draft` separados para `linkedin` y `x`, cada uno con `id`, `body`, `revision`, `photo_id` y `status`. La UI puede trabajar contra un fixture con estos campos hasta que OpenAPI esté disponible. La API rechaza una revisión antigua con HTTP 409.

Rutas bajo `/api/v1`:

- `POST /achievements` recibe audio y foto, devuelve ID y estado de procesamiento.
- `GET /achievements/{id}` devuelve transcripción, hechos y estado.
- `PATCH /achievements/{id}` guarda correcciones con `revision`.
- `POST /achievements/{id}/approve` aprueba una revisión concreta.
- `POST /achievements/{id}/drafts` genera borradores por red desde la revisión aprobada.
- `GET/PATCH /drafts/{id}` lee y edita cada borrador.
- `GET/POST /social/{platform}/connection` consulta conexión e inicia OAuth.
- `POST /drafts/{id}/publications` recibe confirmación e `Idempotency-Key`.
- `GET /publications/{id}` devuelve estado y enlace confirmado.
- `POST /portfolios` recibe CV, plantilla y logros seleccionados.
- `POST /style-preview` recibe URL pública de un pin o imagen de referencia y devuelve una sugerencia visual o un error recuperable.
- `GET /p/{slug}` entrega únicamente contenido aprobado para el portfolio público.

OpenAPI es la fuente del contrato. Los tipos del front se generan desde él cuando esté publicado. Cada issue debe respetar los fixtures comunes. Cambios de campos compartidos se coordinan antes de integrar PR.

## Publicación y fallas

Cada red tiene conexión, permiso y resultado independientes. La publicación requiere confirmación explícita del texto y foto final. El servidor guarda una clave de idempotencia por intento y conserva el resultado para responder a reintentos sin crear otro post. Un timeout luego de enviar se marca `unknown` y se concilia antes de permitir otro envío del mismo borrador. Sólo `succeeded` con identificador o enlace confirmado por el proveedor se muestra como publicado. Cuando la conexión o el acceso API no están disponibles, la UI conserva el borrador y ofrece copiar texto y conservar la foto para publicación manual.

Los adaptadores de LinkedIn y X usan APIs oficiales y OAuth de la cuenta. La disponibilidad y permisos se validan con cuentas de prueba antes de anunciar publicación directa. No se guardan tokens en el navegador ni el repositorio. Los errores se devuelven con código, mensaje y posibilidad de reintentar.

## Portfolio e inspiración

El portfolio reutiliza logros y fotos aprobados. Para crearlo se carga un CV válido y se elige Esencial o Galería. Un pin público de Pinterest o una imagen aportada por la persona puede orientar paleta y composición de estas plantillas. Si la referencia no se obtiene, se mantiene la plantilla elegida y se informa el problema. La vista previa antecede la publicación. El CV, audio, transcripción y fotos no elegidas siguen privados. La URL pública puede revocarse.

## Propiedad y archivos

Issue 1 es dueño de `api/achievements`, extracción, revisión, borradores y OpenAPI. Issue 2 es dueño de `web/crear`, revisión y vistas de publicaciones. Issue 3 es dueño de `api/social`, OAuth, adaptadores LinkedIn/X y estados de publicación, e integra los botones del Issue 2 mediante el contrato. Issue 4 es dueño de `web/portfolio`, `api/portfolios` y `style-preview`. Nadie modifica los archivos de otro issue sin coordinar el contrato.

Los datos personales se consultan por una sesión autenticada y se verifica propiedad en cada endpoint. Audio y archivos originales usan almacenamiento privado. La extracción cita el audio cuando puede, marca incertidumbre y no inventa roles, fechas o impacto. Los tokens de redes se cifran y se guardan del lado servidor. El permiso para publicar en cada red y el permiso para hacer público un portfolio se piden por separado.

## Prueba integrada

En un teléfono, subir audio y foto, corregir un hecho, generar y editar ambos borradores y copiar cada uno. Con acceso API real, conectar una cuenta de prueba y publicar una vez, comprobando su enlace. Repetir la solicitud con la misma clave y comprobar que no duplica. Probar una falla de una red mientras la otra conserva su resultado. Crear un portfolio con CV, elegir plantilla, aplicar una referencia visual y abrir la URL pública en una sesión nueva. Completar el recorrido social sin crear portfolio.

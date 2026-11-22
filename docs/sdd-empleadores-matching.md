# SDD básico — Descubrimiento de talento para empleadores

**Estado**: propuesta para validar después del primer flujo audio + foto → publicación. Basada en la investigación de Mauri del 22/11/2026. No implica que el equipo haya aprobado construir un marketplace.

## 1. Contexto y evidencia

Una conversación con una recruiter sugirió un ecosistema común para estudiantes y empresas, con perfiles buscables y coincidencia en ambos sentidos. Mauri propone que el activo de valor sea el portfolio con logros aprobados, foto y CV, que una recruiter pueda abrir y reenviar. La conversación es una señal cualitativa, no prueba de demanda ni de disposición a pagar.

La nota de Mauri distingue la búsqueda de perfiles digitales junior de la contratación minera en el NOA. No asumir que son el mismo mercado. La prueba inicial vuelve a la recruiter con dos o tres portfolios de ejemplo y pregunta si los usaría para una búsqueda concreta.

## 2. Objetivo del producto

Permitir que un empleador encuentre personas que optaron explícitamente por ser visibles, entienda qué evidencia respalda cada coincidencia y solicite contacto. La persona controla su inclusión, la información visible y el permiso de contacto.

## 3. Actores

- **Candidato/a**: genera logros por audio, corrige y aprueba evidencia, decide si publica portfolio y si participa de búsqueda empresarial.
- **Recruiter/empleador**: describe una necesidad de contratación, revisa coincidencias explicadas y solicita contacto.
- **Operador del piloto**: prepara búsquedas y perfiles de muestra con permiso mientras se valida el flujo.

## 4. Alcance por etapas

### Etapa A — Validación manual

Usar dos o tres portfolios de demostración con logros aprobados y datos de prueba consentidos. Mostrar las páginas a recruiters y observar si las reenviarían, qué evidencia falta y si aportan una búsqueda real. Registrar segmento y resultado. No construir índice vectorial para esta prueba.

### Etapa B — Búsqueda asistida

Sólo si la etapa A revela una necesidad repetida, permitir a una recruiter autorizada introducir requisitos y filtrar perfiles con opt-in por habilidades aprobadas, rubro, ubicación y modalidad. Mostrar coincidencias y evidencia; permitir solicitar contacto. Empezar con filtros y ranking explicable. Evaluar búsqueda semántica después con búsquedas reales y consentimiento, no como requisito previo.

## 5. Requisitos funcionales

1. La publicación en LinkedIn/X o la creación de un portfolio no activa por defecto la búsqueda interna por empresas.
2. El candidato activa por separado “Permitir que empresas encuentren mi perfil”, ve los campos que se compartirán y puede revocar el permiso.
3. El matching sólo usa logros y habilidades aprobados y campos de disponibilidad/ubicación que la persona eligió compartir.
4. Una empresa define cargo/función, habilidades requeridas, rubro, ubicación o remoto, y tipo de contratación como filtros explícitos.
5. Cada resultado explica los requisitos respaldados por evidencia, los no encontrados y los desconocidos. No reduce el perfil a una puntuación opaca.
6. La vista recruiter muestra únicamente campos autorizados y evidencia seleccionada. CV y portfolio se abren sólo según el permiso configurado por la persona.
7. La empresa envía una solicitud de contacto. Datos directos se comparten cuando la persona la acepta.
8. La persona puede ver quién solicitó contacto, aceptar/rechazar y retirar su perfil de resultados.
9. El MVP de validación admite curación manual y datos sintéticos claramente etiquetados. No importa ni indexa automáticamente posts sociales.
10. No se afirma que haya “llegada masiva” de empresas al NOA. Jujuy/Argentina son mercados objetivo a validar, y minería y perfiles digitales son segmentos distintos.

## 6. Datos y diseño técnico inicial

Stack existente: Next.js/TypeScript y Python/FastAPI. Entidades candidatas: `CandidateProfile`, `ApprovedAchievement`, `DiscoveryConsent`, `Employer`, `SearchRequest`, `MatchEvidence`, `ContactRequest`.

- `DiscoveryConsent`: candidato, estado, fecha, campos visibles y fecha de revocación.
- `SearchRequest`: empresa autorizada, descripción/requisitos, filtros de territorio y modalidad.
- `MatchEvidence`: requisito, hecho aprobado que lo respalda, estado `supported | missing | unknown` y referencia al portfolio.
- `ContactRequest`: empresa, candidato, mensaje, estado `pending | accepted | declined | withdrawn`.

Primera versión: PostgreSQL y filtros/ranking determinista sobre habilidades, función, rubro, ubicación y modalidad. No introducir vector DB hasta medir consultas reales y obtener un corpus autorizado suficiente. Si se prueba búsqueda semántica luego, indexar sólo texto aprobado y autorizado, guardar versión/fuente de índice y poder borrar al revocar consentimiento.

## 7. Privacidad y controles

- Consentimiento separado para publicar portfolio y para ser encontrable por empresas.
- Verificar organización/recruiter antes de habilitar búsqueda.
- Autorización por candidato y empresa en cada endpoint; mínimo acceso necesario.
- Registrar acceso y solicitudes de contacto. Revocación retira perfil del índice y detiene futuras búsquedas.
- Audio crudo, transcripción sin aprobar y fotos no seleccionadas nunca se indexan ni se muestran al empleador.
- No procesar menores en este flujo inicial. Si se quisiera incluirlos, requiere diseño y revisión específica antes de hacerlo.
- Exportación/borrado y política de retención a definir antes de un piloto productivo.

## 8. Interfaces candidatas para Etapa B

- `POST /api/v1/discovery/consent` — activar/actualizar visibilidad del candidato.
- `DELETE /api/v1/discovery/consent` — revocar y retirar de futuras búsquedas.
- `POST /api/v1/employer/searches` — crear búsqueda con requisitos y filtros.
- `GET /api/v1/employer/searches/{id}/matches` — resultados paginados con evidencia y estados supported/missing/unknown.
- `POST /api/v1/contact-requests` — solicitar contacto, sin divulgar datos directos.
- `GET/PATCH /api/v1/contact-requests/{id}` — decisión del candidato y estado.

Todas las rutas necesitan autenticación, autorización por dueño/empresa y auditoría. Los detalles se congelan sólo después de la validación de Etapa A.

## 9. Criterios de éxito de validación

- Al menos dos recruiters evalúan los portfolios contra búsquedas concretas y explican qué evidencia necesitan.
- Se registra si reenviarían el portfolio y qué información adicional requieren.
- Una empresa describe una búsqueda real y acuerda un siguiente paso verificable (por ejemplo, revisar candidatos consentidos).
- Se pregunta explícitamente por modelo de pago, pero no se afirma willingness-to-pay hasta observar un compromiso concreto.
- El equipo decide si avanza a búsqueda asistida, cambia segmento o detiene el frente.

## 10. Fuera de alcance inicial

Marketplace abierto, ranking opaco, auto-contacto, envío del CV sin permiso, scraping/importación de LinkedIn/X, inferencia de atributos sensibles, indexar contenido social automáticamente, base vectorial como requisito, cobro y analítica empresarial. Son decisiones posteriores sujetas a validación.

## Fuente

Investigación y sesiones de Mauri en `each_one/mauri/notes/2026-11-22-match-recruiters-estudiantes.md` y `each_one/mauri/sessions/2026-11-22-portfolio-valor-ecosistema.md` del cerebro compartido. La nota distingue explícitamente propuesta de Mauri y decisión del equipo.

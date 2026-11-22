# Propuesta de especificación funcional — Hackathon Tren Solar

**Estado:** alcance funcional acordado para organizar la implementación. El alcance acordado para esta propuesta es convertir un audio y una foto aportados por la persona en borradores revisables para LinkedIn y X, con publicación directa cuando cada integración esté disponible. El portfolio es opcional.

## Recorrido principal

1. La persona graba o sube un audio sobre un proyecto o logro y adjunta una foto. Puede sustituir ambos antes de generar contenido.
2. El sistema transcribe el audio y muestra los hechos que usará. La persona corrige, elimina o completa información y aprueba la versión revisada. Las afirmaciones sin respaldo quedan como pendientes, no se inventan.
3. El sistema genera borradores separados para LinkedIn y X usando sólo la información aprobada y la foto elegida. La persona puede editar cada texto y ver la vista previa antes de confirmar.
4. Para cada red, la persona puede copiar el borrador. Si la integración de esa red está conectada y operativa, puede publicarlo directamente mediante una acción explícita y recibir confirmación o un error recuperable.
5. Si decide crear un portfolio, elige la plantilla **Esencial** o **Galería**, puede aportar un enlace de Pinterest o una imagen como inspiración visual y debe cargar un CV para completar la creación. La inspiración orienta el estilo; no se copia contenido del enlace ni se afirma que Pinterest esté integrado. Puede omitir el portfolio y terminar con los borradores.

## Criterios de aceptación

- Sin audio válido o sin foto, el sistema indica qué falta y no inicia la generación. La persona puede reemplazar archivos rechazados sin perder los otros datos.
- Antes de generar borradores se ve la transcripción y los hechos extraídos; la persona puede corregirlos y aprobarlos. Roles, fechas, impacto, tecnologías y resultados no dichos o no confirmados no aparecen como hechos.
- Hay un borrador editable y copiable para LinkedIn y otro para X. Las ediciones de una red no alteran la otra. La vista previa muestra el texto final y la foto seleccionada.
- Ninguna red recibe contenido sin confirmación explícita para esa red. La interfaz distingue **borrador**, **listo para publicar**, **publicando**, **publicado** y **falló**; sólo muestra «publicado» tras confirmación de la plataforma.
- Si la publicación directa de una red no está disponible, la acción de publicar se deshabilita con una explicación y sigue disponible copiar el texto y descargar o conservar la foto. La disponibilidad de LinkedIn y X se evalúa por separado.
- Crear portfolio es una elección separada. No se exige CV para preparar o publicar borradores; sí se exige un CV válido para completar un portfolio. La persona puede cambiar entre Esencial y Galería antes de confirmarlo.
- El enlace de Pinterest o la imagen de inspiración son opcionales para el portfolio. Si el enlace no se puede leer, se informa y se permite seguir sin inspiración o usar una imagen.

## Estados de falla y recuperación

| Falla | Comportamiento esperado |
| --- | --- |
| Audio o foto inválidos, demasiado grandes o ilegibles | Mostrar el archivo afectado y permitir reemplazarlo. No generar con datos incompletos. |
| Transcripción o generación falla | Conservar los archivos y las correcciones; ofrecer reintentar o editar manualmente los hechos y borradores disponibles. |
| Datos insuficientes o contradictorios | Marcar la duda para revisión; no completar con conjeturas ni afirmar impacto. |
| Integración ausente, sesión vencida o permiso insuficiente | Explicar qué red está afectada; ofrecer reconectar cuando corresponda y mantener la opción de copiar. |
| Publicación rechazada o resultado incierto | No mostrar éxito; conservar el borrador y el error. Ante resultado incierto, pedir verificar en la red antes de reintentar para evitar duplicados. |
| CV inválido o faltante al crear portfolio | Mantener el portfolio en borrador y permitir subir otro CV. Los borradores sociales siguen disponibles. |
| Inspiración no accesible | Continuar con la plantilla elegida sin inspiración o permitir sustituirla por imagen. |

## Límites de esta propuesta

No incluye búsqueda de oportunidades, postulaciones automáticas, recomendaciones de mercado ni decisión de marca o stack. Las integraciones de publicación, sus permisos y límites requieren verificación técnica antes de prometerlas como disponibles.

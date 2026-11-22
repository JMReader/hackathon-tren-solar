import { palettes } from "./catalog"
import type { PublicPortfolio } from "./types"

export const demoPortfolio: PublicPortfolio = {
  slug: "lucia-tolaba-ux",
  display_name: "Lucía Tolaba",
  headline: "Diseñadora UX/UI",
  photo_url: null,
  template_id: "esencial",
  palette: palettes[0],
  cv_url: null,
  published_at: "2026-11-22T18:00:00Z",
  items: [
    {
      title: "App de turnos para una clínica de Jujuy",
      occurred_on: "2026-11",
      photo_url: null,
      facts: [
        {
          category: "project",
          text: "Equipo de 3 personas construyó una app de turnos médicos en React para una clínica local en Jujuy.",
          source: "transcript",
        },
        {
          category: "role",
          text: "Diseñó todas las pantallas en Figma, el flujo de reserva en 3 pasos y maquetó los componentes base en React.",
          source: "user",
        },
      ],
    },
    {
      title: "Checkout más corto para un proyecto de la facu",
      occurred_on: "2026-08",
      photo_url: null,
      facts: [
        {
          category: "project",
          text: "Rediseñó el checkout de un proyecto de la facultad y dejó sólo los campos que el pago necesitaba.",
          source: "transcript",
        },
        {
          category: "learning",
          text: "Justificó frente al equipo cada campo que quedó en el formulario.",
          source: "user",
        },
      ],
    },
    {
      title: "Taller de Figma para primer año",
      occurred_on: "2026-05",
      photo_url: null,
      facts: [
        {
          category: "project",
          text: "Dio un taller de Figma de dos encuentros para estudiantes de primer año.",
          source: "transcript",
        },
      ],
    },
  ],
}

export function findDemoPortfolio(slug: string) {
  return slug === demoPortfolio.slug ? demoPortfolio : undefined
}

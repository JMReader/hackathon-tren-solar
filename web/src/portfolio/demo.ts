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
          text: "Hicimos entre tres una app de turnos en React para una clínica de Jujuy.",
          source: "transcript",
        },
        {
          category: "role",
          text: "Diseñé las pantallas en Figma y el flujo para reservar en tres pasos. También maqueté los componentes base.",
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
          text: "Rediseñé el checkout y saqué los campos que el pago no necesitaba.",
          source: "transcript",
        },
        {
          category: "learning",
          text: "Tuve que defender frente al equipo cada campo que quedó.",
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
          text: "Di un taller de Figma de dos encuentros para los chicos de primer año.",
          source: "transcript",
        },
      ],
    },
  ],
}

export function findDemoPortfolio(slug: string) {
  return slug === demoPortfolio.slug ? demoPortfolio : undefined
}

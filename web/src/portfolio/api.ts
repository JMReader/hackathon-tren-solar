import { findPalette, findTemplate } from "./catalog"
import { findDemoPortfolio } from "./demo"
import type { PublicPortfolio } from "./types"

const apiUrl = process.env.PORTFOLIO_API_URL

export async function getPublicPortfolio(slug: string): Promise<PublicPortfolio | null> {
  if (!apiUrl) return findDemoPortfolio(slug) ?? null
  const response = await fetch(`${apiUrl}/p/${encodeURIComponent(slug)}`, { cache: "no-store" })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GET /p/${slug} respondió ${response.status}`)
  return response.json()
}

export function withDemoOverrides(portfolio: PublicPortfolio, templateId?: string, paletteId?: string): PublicPortfolio {
  if (!findDemoPortfolio(portfolio.slug)) return portfolio
  const template = templateId ? findTemplate(templateId) : undefined
  const palette = paletteId ? findPalette(paletteId) : undefined
  return {
    ...portfolio,
    template_id: template?.tier === "free" ? template.id : portfolio.template_id,
    palette: palette ?? portfolio.palette,
  }
}

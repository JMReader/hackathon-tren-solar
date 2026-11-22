export type Tier = "free" | "pro"
export type FactCategory = "project" | "role" | "tech" | "impact" | "date" | "learning" | "context"
export type FactSource = "transcript" | "user" | "mcp"

export type PaletteTokens = {
  bg: string
  surface: string
  ink: string
  muted: string
  accent: string
  on_accent: string
}

export type Palette = {
  id: string
  name: string
  tier: Tier
  scheme: "light" | "dark"
  tokens: PaletteTokens
}

export type PortfolioTemplate = {
  id: string
  name: string
  tier: Tier
  description: string
}

export type PublicFact = {
  category?: FactCategory
  text: string
  source: FactSource
}

export type PublicPortfolioItem = {
  title: string
  occurred_on: string | null
  photo_url: string | null
  facts: PublicFact[]
}

export type PublicPortfolio = {
  slug: string
  display_name: string
  headline: string | null
  photo_url: string | null
  template_id: string
  palette: Palette
  items: PublicPortfolioItem[]
  cv_url: string | null
  published_at: string
}

export type ProInterest = {
  response: "interested" | "not_now"
  trigger: "template" | "palette" | "customize"
  item_id: string | null
  price_band_ars_month: "none" | "up_to_2000" | "2000_5000" | "5000_10000" | "over_10000" | null
}

import { findPalette, palettes } from "./catalog"
import type { PortfolioItem, PortfolioRecord } from "./portfolio-api"
import type { FactCategory, FactSource, PublicPortfolio } from "./types"
import type { Achievement, AuthorProfile } from "@/lib/api/types"
import { getPhotoPreview } from "@/lib/photo-preview"

function factCategory(value: string | null | undefined): FactCategory | undefined {
  if (!value) return undefined
  const allowed: FactCategory[] = ["project", "role", "tech", "impact", "date", "learning", "context"]
  return allowed.includes(value as FactCategory) ? (value as FactCategory) : undefined
}

function factSource(value: string): FactSource {
  if (value === "user" || value === "mcp") return value
  return "transcript"
}

export function buildEditorPreview(
  portfolio: PortfolioRecord,
  profile: AuthorProfile,
  achievements: Achievement[],
  templateId: string,
  paletteId: string,
  cvDownloadable: boolean,
  photoUrl: (photoId: string | null | undefined) => string | null = getPhotoPreview,
): PublicPortfolio {
  const palette = findPalette(paletteId) ?? palettes[0]
  const byId = new Map(achievements.map((a) => [a.id, a]))
  return {
    slug: portfolio.slug ?? "borrador",
    display_name: portfolio.display_name,
    headline: portfolio.headline ?? profile.profession,
    // The API keeps photos private until publishing; the editor previews the copies kept in this browser.
    photo_url: photoUrl(profile.photo_id),
    template_id: templateId,
    palette,
    cv_url: cvDownloadable ? "#cv" : null,
    published_at: portfolio.published_at ?? new Date().toISOString(),
    items: portfolio.items.map((item: PortfolioItem) => {
      const ach = byId.get(item.achievement_id)
      return {
        title: item.title,
        occurred_on: item.occurred_on,
        photo_url: item.show_photo ? photoUrl(ach?.photo_id) : null,
        facts:
          ach?.facts.map((f) => ({
            category: factCategory(f.category),
            text: f.text,
            source: factSource(f.source),
          })) ?? [],
      }
    }),
  }
}

export function defaultAchievementTitle(achievement: Achievement): string {
  const text = achievement.facts[0]?.text?.trim()
  if (!text) return "Mi logro"
  const title = text[0].toLocaleUpperCase("es-AR") + text.slice(1)
  return title.length > 80 ? `${title.slice(0, 77)}...` : title
}
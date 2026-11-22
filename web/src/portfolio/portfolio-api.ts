import { apiFetch } from "@/lib/api/client"

export type PortfolioItem = {
  achievement_id: string
  title: string
  occurred_on: string | null
  show_photo: boolean
}

export type PortfolioRecord = {
  id: string
  status: "draft" | "published" | "revoked"
  revision: number
  display_name: string
  headline: string | null
  items: PortfolioItem[]
  template_id: string
  palette_id: string
  cv_downloadable: boolean
  has_cv: boolean
  slug: string | null
  public_url: string | null
  published_revision: number | null
  published_at: string | null
}

export type CreatePortfolioBody = {
  display_name: string
  headline?: string | null
  items: PortfolioItem[]
  template_id: string
  palette_id: string
  cv_downloadable?: boolean
}

export type UpdatePortfolioBody = {
  revision: number
  display_name?: string
  headline?: string | null
  items?: PortfolioItem[]
  template_id?: string
  palette_id?: string
  cv_downloadable?: boolean
}

export function fetchPortfolio(id: string) {
  return apiFetch<PortfolioRecord>(`/portfolios/${id}`)
}

export function createPortfolio(body: CreatePortfolioBody) {
  return apiFetch<PortfolioRecord>("/portfolios", { method: "POST", json: body })
}

export function updatePortfolio(id: string, body: UpdatePortfolioBody) {
  return apiFetch<PortfolioRecord>(`/portfolios/${id}`, { method: "PATCH", json: body })
}

export function publishPortfolio(id: string, revision: number) {
  return apiFetch<PortfolioRecord>(`/portfolios/${id}/publish`, {
    method: "POST",
    json: { revision, confirm_public: true },
  })
}
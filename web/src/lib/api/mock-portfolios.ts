// Local mock of /portfolios and the public snapshot, modeled on api/app/portfolio/service.py.
// Production goes to FastAPI (vercel.json); this only serves `next dev` without NEXT_PUBLIC_API_URL.
import { findPalette, findTemplate } from "@/portfolio/catalog"
import type { PortfolioItem, PortfolioRecord } from "@/portfolio/portfolio-api"
import type { PublicPortfolio } from "@/portfolio/types"
import { findOwnedAchievement } from "./mock-achievements"
import { apiError, requireSession } from "./mock-store"

type Session = Exclude<ReturnType<typeof requireSession>, Response>
type Row = Omit<PortfolioRecord, "has_cv" | "public_url"> & { owner: string }

interface Store {
  portfolios: Map<string, Row>
  published: Map<string, PublicPortfolio>
}
const g = globalThis as typeof globalThis & { __trenSolarPortfolios?: Store }
const store: Store = (g.__trenSolarPortfolios ??= { portfolios: new Map(), published: new Map() })

function toRecord(row: Row, s: Session): PortfolioRecord {
  const { id, status, revision, display_name, headline, items, template_id, palette_id, cv_downloadable, slug, published_revision, published_at } = row
  return {
    id, status, revision, display_name, headline, items, template_id, palette_id, cv_downloadable, slug, published_revision, published_at,
    has_cv: Boolean(s.cvDocument),
    public_url: row.slug && row.status === "published" ? `/p/${row.slug}` : null,
  }
}

function validate(s: Session, body: Partial<Row>): Response | null {
  if (body.template_id !== undefined) {
    const t = findTemplate(body.template_id)
    if (!t) return apiError(404, "not_found", `No existe la plantilla ${body.template_id}`)
    if (t.tier === "pro") return apiError(422, "pro_required", "La plantilla o paleta elegida requiere plan Pro.")
  }
  if (body.palette_id !== undefined) {
    const p = findPalette(body.palette_id)
    if (!p) return apiError(404, "not_found", `No existe la paleta ${body.palette_id}`)
    if (p.tier === "pro") return apiError(422, "pro_required", "La plantilla o paleta elegida requiere plan Pro.")
  }
  if (body.display_name !== undefined && (body.display_name.length < 2 || body.display_name.length > 60))
    return apiError(422, "validation_error", "El nombre tiene que tener entre 2 y 60 caracteres")
  if (body.items !== undefined) {
    if (body.items.length < 1 || body.items.length > 12) return apiError(422, "validation_error", "Entre 1 y 12 logros")
    for (const item of body.items) {
      const a = findOwnedAchievement(s.id, item.achievement_id)
      if (!a) return apiError(404, "not_found", `No existe el logro ${item.achievement_id}`)
      if (a.status !== "approved")
        return apiError(422, "achievement_not_approved", `El logro '${item.achievement_id}' debe estar aprobado.`)
      if (item.title.length < 3 || item.title.length > 80)
        return apiError(422, "validation_error", "El título tiene que tener entre 3 y 80 caracteres")
    }
  }
  return null
}

function owned(s: Session, id: string): Row | Response {
  const row = store.portfolios.get(id)
  return row && row.owner === s.id ? row : apiError(404, "not_found", "No existe ese portfolio")
}

export async function createPortfolio(request: Request): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const body = (await request.json().catch(() => null)) as Partial<Row> | null
  if (!body?.display_name || !body.items || !body.template_id || !body.palette_id)
    return apiError(422, "validation_error", "Faltan campos del portfolio")
  const invalid = validate(s, body)
  if (invalid) return invalid
  const row: Row = {
    owner: s.id,
    id: `pf_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    status: "draft",
    revision: 1,
    display_name: body.display_name,
    headline: body.headline ?? null,
    items: body.items as PortfolioItem[],
    template_id: body.template_id,
    palette_id: body.palette_id,
    cv_downloadable: body.cv_downloadable ?? false,
    slug: null,
    published_revision: null,
    published_at: null,
  }
  store.portfolios.set(row.id, row)
  return Response.json(toRecord(row, s), { status: 201 })
}

export function getPortfolio(request: Request, id: string): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const row = owned(s, id)
  return row instanceof Response ? row : Response.json(toRecord(row, s))
}

export async function updatePortfolio(request: Request, id: string): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const row = owned(s, id)
  if (row instanceof Response) return row
  const body = (await request.json().catch(() => null)) as (Partial<Row> & { revision?: number }) | null
  if (!body || typeof body.revision !== "number") return apiError(422, "validation_error", "Falta la revisión")
  if (body.revision !== row.revision) return apiError(409, "revision_conflict", "La revisión enviada no coincide con la actual")
  const invalid = validate(s, body)
  if (invalid) return invalid
  for (const key of ["display_name", "headline", "items", "template_id", "palette_id", "cv_downloadable"] as const)
    if (body[key] !== undefined) Object.assign(row, { [key]: body[key] })
  row.revision += 1
  return Response.json(toRecord(row, s))
}

const slugify = (name: string) => {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
  return slug.length >= 3 ? slug : `autor-${crypto.randomUUID().slice(0, 8)}`
}

export async function publishPortfolio(request: Request, id: string): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const row = owned(s, id)
  if (row instanceof Response) return row
  const body = (await request.json().catch(() => null)) as { revision?: number; confirm_public?: boolean } | null
  if (body?.revision !== row.revision) return apiError(409, "revision_conflict", "La revisión enviada no coincide con la actual")
  if (body.confirm_public !== true) return apiError(422, "confirm_public_required", "Debés confirmar con confirm_public: true.")
  if (!s.cvDocument) return apiError(422, "cv_required", "Subí tu CV en la sesión antes de publicar el portfolio.")

  let slug = row.slug ?? slugify(row.display_name)
  for (let n = 2; [...store.portfolios.values()].some((p) => p.slug === slug && p.id !== row.id); n++)
    slug = `${slugify(row.display_name).slice(0, 56)}-${n}`
  const now = new Date().toISOString()
  store.published.set(slug, {
    slug,
    display_name: row.display_name,
    headline: row.headline ?? s.profession,
    photo_url: null,
    template_id: row.template_id,
    palette: findPalette(row.palette_id)!,
    cv_url: null,
    published_at: now,
    items: row.items.map((item) => ({
      title: item.title,
      occurred_on: item.occurred_on,
      photo_url: null,
      facts: (findOwnedAchievement(s.id, item.achievement_id)?.facts ?? []).map((f) => ({
        category: f.category ?? undefined,
        text: f.text,
        source: f.source,
      })),
    })),
  })
  Object.assign(row, { status: "published", slug, published_revision: row.revision, published_at: now })
  return Response.json(toRecord(row, s))
}

export function unpublishPortfolio(request: Request, id: string): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const row = owned(s, id)
  if (row instanceof Response) return row
  if (row.status !== "published" || !row.slug) return apiError(409, "invalid_state", "El portfolio no está publicado.")
  store.published.delete(row.slug)
  row.status = "revoked"
  return Response.json(toRecord(row, s))
}

/** Public snapshot for /p/[slug] when there is no PORTFOLIO_API_URL. */
export function findMockPublicPortfolio(slug: string): PublicPortfolio | null {
  return store.published.get(slug) ?? null
}

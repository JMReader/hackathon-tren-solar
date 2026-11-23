// Local mock of /achievements and /drafts, modeled on the backend's FakeTranscriber/FakeLLM.
// In production /api/* goes to FastAPI (vercel.json), so this only serves `next dev` without NEXT_PUBLIC_API_URL.
import { apiError, hasMedia, requireSession, saveImage, toProfile } from "./mock-store"
import { addApprovedToPortfolio, removeFromMockPortfolios } from "./mock-portfolios"
import type {
  Achievement,
  Draft,
  Fact,
  FactCategory,
  GenerateDraftsResponse,
  OpenQuestion,
  Platform,
} from "./types"

type Session = Exclude<ReturnType<typeof requireSession>, Response>

const DEFAULT_TRANSCRIPT =
  "Este finde hicimos una app de turnos médicos en React para una clínica local. " +
  "Yo diseñé las pantallas y armé el flujo de reserva en 3 pasos. Todavía no medimos cuánta gente la usó."

const MAX_CHARS: Record<Platform, number> = { linkedin: 3000, x: 280 }

interface Store {
  achievements: Map<string, { owner: string; value: Achievement; updatedAt: number }>
  drafts: Map<string, { owner: string; value: Draft }>
}
const g = globalThis as typeof globalThis & { __trenSolarAchievements?: Store }
const store: Store = (g.__trenSolarAchievements ??= { achievements: new Map(), drafts: new Map() })

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`

const has = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "iu").test(text))

const FIRST_PERSON = ["yo", "diseñé", "armé", "creé", "programé", "hice", "maqueté", "construí", "lideré", "me encargué", "me tocó"]
const COLLECTIVE = ["hicimos", "armamos", "creamos", "lanzamos", "desarrollamos", "construimos", "éramos", "equipo", "ganamos"]
const CODING = ["programé", "maqueté", "desarrollé", "implementé", "construí"]
const TECH = ["react", "figma", "python", "typescript", "javascript", "next.js", "node", "tailwind", "postgres", "supabase", "flutter"]
const UNMEASURED = ["no medimos", "todavía no", "aún no", "sin métricas"]

function category(sentence: string): FactCategory | null {
  if (has(sentence, ["aprendí", "aprendimos", "entendí"])) return "learning"
  if (has(sentence, FIRST_PERSON)) return "role"
  if (has(sentence, COLLECTIVE)) return "project"
  if (/\d/.test(sentence) && has(sentence, ["usuarios", "personas", "ventas", "horas"])) return "impact"
  if (has(sentence, ["este finde", "hoy", "ayer", "esta semana"])) return "date"
  return null
}

function extract(transcript: string): { facts: Fact[]; questions: OpenQuestion[] } {
  const sentences = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length >= 4)
  const facts: Fact[] = []
  for (const sentence of sentences) {
    const cat = category(sentence)
    const tech = TECH.some((t) => sentence.toLowerCase().includes(t))
    if (!cat && !tech && !/\d/.test(sentence)) continue
    if (has(sentence, UNMEASURED)) continue
    facts.push({ id: `fact_${facts.length + 1}`, category: cat ?? "context", text: sentence, source_quote: sentence, source: "transcript" })
  }
  const questions: OpenQuestion[] = []
  const roles = facts.filter((f) => f.category === "role")
  const tech = TECH.filter((t) => transcript.toLowerCase().includes(t))
  if (tech.length && roles.length && !roles.some((f) => has(f.text, CODING)))
    questions.push({ id: `q_${questions.length + 1}`, field: "tech_contribution", question: `Se menciona ${tech.join(", ")}: ¿también escribiste código o tu rol fue de diseño o producto?` })
  if (has(transcript, UNMEASURED))
    questions.push({ id: `q_${questions.length + 1}`, field: "impact", question: "Indicaste que todavía no hay métricas. ¿Querés destacar algún problema concreto que resolvía?" })
  if (!roles.length)
    questions.push({ id: `q_${questions.length + 1}`, field: "role", question: "¿Cuál fue tu contribución concreta dentro del equipo?" })
  return { facts, questions }
}

function draftBody(platform: Platform, facts: Fact[]): string {
  const lines = facts.map((f) => f.text.replace(/\.$/, "") + ".")
  if (platform === "linkedin")
    return [lines.slice(0, 2).join(" "), lines.slice(2).join(" "), "¿Qué miran primero ustedes cuando arman algo así?"]
      .filter(Boolean)
      .join("\n\n")
  const text = lines.join(" ").toLowerCase()
  return text.length <= MAX_CHARS.x ? text : `${text.slice(0, MAX_CHARS.x - 1).replace(/\s+\S*$/, "")}…`
}

function owned<T>(map: Map<string, { owner: string; value: T; updatedAt?: number }>, key: string, s: Session, kind: string): T | Response {
  const found = map.get(key)
  if (!found || found.owner !== s.id) return apiError(404, "not_found", `No existe ese ${kind}`)
  if ("updatedAt" in found) found.updatedAt = Date.now()
  return found.value
}

/** Used by the portfolio mock: approved achievements of a session, by id. */
export function findOwnedAchievement(sessionId: string, achievementId: string): Achievement | null {
  const found = store.achievements.get(achievementId)
  return found && found.owner === sessionId ? found.value : null
}

export function listAchievements(request: Request): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const mine = [...store.achievements.values()].filter((e) => e.owner === s.id)
  mine.sort((a, b) => b.updatedAt - a.updatedAt)
  return Response.json(mine.map((e) => e.value))
}

function revisionConflict(current: number, sent: unknown): Response | null {
  if (typeof sent !== "number") return apiError(422, "validation_error", "Falta la revisión")
  return sent === current ? null : apiError(409, "revision_conflict", "La revisión enviada no coincide con la actual")
}

export async function createAchievement(request: Request): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  if (!toProfile(s).ready_for_achievement || s.onboardingStatus !== "complete")
    return apiError(403, "onboarding_incomplete", "Completá el onboarding antes de crear un logro")

  let inputType: "audio" | "text" = "text"
  let text = ""
  let photoId: string | null = null
  let audio = false
  if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const form = await request.formData()
    inputType = form.get("input_type") === "text" ? "text" : "audio"
    text = String(form.get("text") ?? "").trim()
    const audioFile = form.get("audio")
    audio = audioFile instanceof File && audioFile.size > 0
    const photo = form.get("photo")
    if (photo instanceof File && photo.size > 0) {
      const asset = saveImage(photo)
      if (asset instanceof Response) return asset
      photoId = asset.photo_id
    }
    if (inputType === "audio" && !audio && text.length < 10)
      return apiError(400, "missing_audio", "input_type='audio' necesita el archivo `audio` (o `text` >= 10 chars).")
  } else {
    const body = (await request.json().catch(() => null)) as { text?: string; photo_id?: string | null } | null
    text = (body?.text ?? "").trim()
    if (body?.photo_id) {
      if (!hasMedia(body.photo_id)) return apiError(404, "media_not_found", "No existe una imagen con ese id")
      photoId = body.photo_id
    }
  }
  if (inputType === "text" && text.length < 10)
    return apiError(400, "missing_input", "Se necesita `text` de al menos 10 caracteres.")

  const transcript = audio ? [DEFAULT_TRANSCRIPT, text].filter(Boolean).join(" ") : text
  const { facts, questions } = extract(transcript)
  const achievement: Achievement = {
    id: id("ach"),
    input_type: inputType,
    status: "needs_review",
    revision: 1,
    photo_id: photoId,
    transcript,
    facts,
    open_questions: questions,
    error: null,
  }
  store.achievements.set(achievement.id, { owner: s.id, value: achievement, updatedAt: Date.now() })
  return Response.json(achievement, { status: 201 })
}

export function getAchievement(request: Request, achievementId: string): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const a = owned(store.achievements, achievementId, s, "logro")
  return a instanceof Response ? a : Response.json(a)
}

export async function updateAchievement(request: Request, achievementId: string): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const a = owned(store.achievements, achievementId, s, "logro")
  if (a instanceof Response) return a
  const body = (await request.json().catch(() => null)) as { revision?: number; facts?: Fact[] } | null
  if (!body || !Array.isArray(body.facts)) return apiError(422, "validation_error", "Faltan los hechos")
  const conflict = revisionConflict(a.revision, body.revision)
  if (conflict) return conflict
  const prev = new Map(a.facts.map((f) => [f.id, f]))
  a.facts = body.facts.map((f) => {
    const old = prev.get(f.id)
    return old && old.source !== "user" && old.text === f.text
      ? { ...old, category: f.category ?? old.category }
      : { id: f.id, category: f.category ?? null, text: f.text, source_quote: null, source: "user" }
  })
  a.revision += 1
  if (a.status === "approved" || a.status === "failed") a.status = "needs_review"
  return Response.json(a)
}

export async function approveAchievement(request: Request, achievementId: string): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const a = owned(store.achievements, achievementId, s, "logro")
  if (a instanceof Response) return a
  const body = (await request.json().catch(() => null)) as { revision?: number; add_to_portfolio?: boolean } | null
  const conflict = revisionConflict(a.revision, body?.revision)
  if (conflict) return conflict
  if (a.status !== "approved") {
    if (a.status !== "needs_review") return apiError(409, "invalid_state", `El logro está en estado '${a.status}'`)
    a.status = "approved"
  }
  if (body?.add_to_portfolio === true) addApprovedToPortfolio(s, a)
  return Response.json(a)
}

export async function generateDrafts(request: Request, achievementId: string): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const a = owned(store.achievements, achievementId, s, "logro")
  if (a instanceof Response) return a
  const body = (await request.json().catch(() => null)) as { achievement_revision?: number; platforms?: Platform[] } | null
  const conflict = revisionConflict(a.revision, body?.achievement_revision)
  if (conflict) return conflict
  if (a.status !== "approved") return apiError(409, "invalid_state", "Generar borradores exige un logro aprobado")
  const platforms = [...new Set<Platform>(body?.platforms ?? ["linkedin", "x"])]
  const drafts = platforms.map((platform): Draft => {
    const text = draftBody(platform, a.facts)
    const draft: Draft = {
      id: id(platform === "linkedin" ? "drf_li" : "drf_x"),
      achievement_id: a.id,
      achievement_revision: a.revision,
      platform,
      revision: 1,
      status: "ready_to_publish",
      photo_id: a.photo_id,
      body: text,
      char_count: text.length,
      max_chars: MAX_CHARS[platform],
      used_fact_ids: a.facts.map((f) => f.id),
    }
    store.drafts.set(draft.id, { owner: s.id, value: draft })
    return draft
  })
  const response: GenerateDraftsResponse = { achievement_id: a.id, achievement_revision: a.revision, drafts }
  return Response.json(response, { status: 201 })
}

export function getDraft(request: Request, draftId: string): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const d = owned(store.drafts, draftId, s, "borrador")
  return d instanceof Response ? d : Response.json(d)
}

export async function updateDraft(request: Request, draftId: string): Promise<Response> {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const d = owned(store.drafts, draftId, s, "borrador")
  if (d instanceof Response) return d
  const body = (await request.json().catch(() => null)) as { revision?: number; body?: string } | null
  if (!body?.body) return apiError(422, "validation_error", "El texto no puede estar vacío")
  const conflict = revisionConflict(d.revision, body.revision)
  if (conflict) return conflict
  if (body.body.length > d.max_chars)
    return apiError(400, "body_too_long", `El texto excede ${d.max_chars} caracteres para ${d.platform} (${body.body.length}).`)
  d.body = body.body
  d.char_count = body.body.length
  d.revision += 1
  return Response.json(d)
}

export function listDrafts(request: Request, achievementId: string): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const a = owned(store.achievements, achievementId, s, "logro")
  if (a instanceof Response) return a
  const drafts = [...store.drafts.values()].filter((d) => d.owner === s.id && d.value.achievement_id === achievementId)
  return Response.json(drafts.map((d) => d.value).reverse())
}

export function deleteAchievement(request: Request, achievementId: string): Response {
  const s = requireSession(request)
  if (s instanceof Response) return s
  const a = owned(store.achievements, achievementId, s, "logro")
  if (a instanceof Response) return a
  store.achievements.delete(achievementId)
  for (const [id, d] of store.drafts) if (d.value.achievement_id === achievementId) store.drafts.delete(id)
  removeFromMockPortfolios(s.id, achievementId)
  return new Response(null, { status: 204 })
}

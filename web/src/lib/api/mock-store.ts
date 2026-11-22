import type {
  ApiError,
  AuthorProfile,
  CvDocument,
  MediaAsset,
  OnboardingStatus,
  Platform,
  SessionCreated,
  SocialConnectionStatus,
  StyleSyncResult,
  SyncStyleRequest,
  UpdateAuthorProfileRequest,
  VoiceContext,
} from "./types"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const PDF_TYPE = "application/pdf"
const PLATFORMS: Platform[] = ["linkedin", "x"]

const CANNED_POSTS: Record<Platform, string[]> = {
  linkedin: [
    "La semana pasada cerré una etapa grande: rediseñamos el checkout y el equipo tardó la mitad en completar cada prueba. Orgullosa del laburo en equipo.",
    "Algo que aprendí este año: diseñar formularios cortos parece fácil hasta que te toca pelear cada campo que sobra.",
    "Gracias a todas las personas que se sumaron al meetup del jueves. Volvería a armarlo mil veces.",
  ],
  x: [
    "rediseñar un checkout es 10% pixels y 90% decir que no",
    "hoy aprendí que «un cambio chiquito» nunca es chiquito",
    "shipeamos un viernes. nada más que decir.",
  ],
}

const X_UNAVAILABLE: SocialConnectionStatus = {
  platform: "x",
  status: "access_unavailable",
  can_publish_text: false,
  can_publish_image: false,
  can_read_posts: false,
  account_handle: null,
  reason:
    "La app de X no tiene habilitado el permiso de escritura (tweet.write) en este entorno. Podés copiar el borrador y descargar la foto.",
}

interface StoredSession {
  id: string
  expiresAt: string
  revision: number
  onboardingStatus: OnboardingStatus
  profession: string | null
  photoId: string | null
  writingSample: string | null
  cvDocument: CvDocument | null
  voiceContext: VoiceContext | null
  styleSync: {
    last_attempt_at: string | null
    linkedin: StyleSyncResult
    x: StyleSyncResult
  }
  connections: Record<Platform, SocialConnectionStatus>
}

interface MockStore {
  sessions: Map<string, StoredSession>
  media: Map<string, MediaAsset>
}

const g = globalThis as typeof globalThis & { __trenSolarMockStore?: MockStore }
const store: MockStore = (g.__trenSolarMockStore ??= {
  sessions: new Map(),
  media: new Map(),
})

export function apiError(
  status: number,
  code: string,
  message: string,
  retryable = false,
): Response {
  const body: ApiError = { error: { code, message, retryable } }
  return Response.json(body, { status })
}

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as string[]).includes(value)
}

export function requireSession(request: Request): StoredSession | Response {
  const id = request.headers.get("x-session-id")
  if (!id) return apiError(401, "missing_session", "Falta el header X-Session-Id")
  const session = store.sessions.get(id)
  if (!session)
    return apiError(401, "invalid_session", "Sesión desconocida o expirada")
  return session
}

function skipped(): StyleSyncResult {
  return { status: "skipped", posts_imported: 0, message: null }
}

function disconnected(platform: Platform): SocialConnectionStatus {
  return {
    platform,
    status: "disconnected",
    can_publish_text: false,
    can_publish_image: false,
    can_read_posts: false,
    account_handle: null,
    reason: null,
  }
}

export function createSession(): SessionCreated {
  const id = `ses_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  store.sessions.set(id, {
    id,
    expiresAt,
    revision: 1,
    onboardingStatus: "not_started",
    profession: null,
    photoId: null,
    writingSample: null,
    cvDocument: null,
    voiceContext: null,
    styleSync: { last_attempt_at: null, linkedin: skipped(), x: skipped() },
    connections: { linkedin: disconnected("linkedin"), x: disconnected("x") },
  })
  return { session_id: id, expires_at: expiresAt }
}

function hasSamplePosts(s: StoredSession): boolean {
  const posts = s.voiceContext?.sample_posts
  return Boolean(posts && [...(posts.linkedin ?? []), ...(posts.x ?? [])].length)
}

function readyForAchievement(s: StoredSession): boolean {
  return Boolean(
    s.profession &&
      s.photoId &&
      ((s.writingSample?.length ?? 0) >= 20 || hasSamplePosts(s)),
  )
}

export function toProfile(s: StoredSession): AuthorProfile {
  return {
    session_id: s.id,
    onboarding_status: s.onboardingStatus,
    revision: s.revision,
    ready_for_achievement: readyForAchievement(s),
    profession: s.profession,
    photo_id: s.photoId,
    writing_sample: s.writingSample,
    cv_document: s.cvDocument,
    voice_context: s.voiceContext,
    style_sync: s.styleSync,
  }
}

function mutate(s: StoredSession) {
  s.revision += 1
  if (s.onboardingStatus === "not_started") s.onboardingStatus = "in_progress"
}

function checkRevision(
  s: StoredSession,
  revision: unknown,
): Response | null {
  if (typeof revision !== "number" || revision < 1)
    return apiError(400, "invalid_revision", "Falta o es inválida la revisión")
  if (revision !== s.revision)
    return apiError(
      409,
      "revision_conflict",
      "La revisión enviada no coincide con la actual",
    )
  return null
}

export async function updateProfile(
  s: StoredSession,
  request: Request,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | UpdateAuthorProfileRequest
    | null
  if (!body) return apiError(400, "invalid_body", "Cuerpo JSON inválido")
  const conflict = checkRevision(s, body.revision)
  if (conflict) return conflict

  if (
    body.profession !== undefined &&
    body.profession !== null &&
    body.profession.length < 2
  )
    return apiError(
      400,
      "profession_too_short",
      "La profesión necesita al menos 2 caracteres",
    )
  if (
    typeof body.writing_sample === "string" &&
    body.writing_sample.length < 20 &&
    !hasSamplePosts(s)
  )
    return apiError(
      400,
      "writing_sample_too_short",
      "La muestra de escritura necesita al menos 20 caracteres",
    )

  if (body.profession !== undefined) s.profession = body.profession
  if (body.writing_sample !== undefined) s.writingSample = body.writing_sample
  mutate(s)
  return Response.json(toProfile(s))
}

export async function setProfilePhoto(
  s: StoredSession,
  request: Request,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    revision?: number
    photo_id?: string
  } | null
  if (!body || typeof body.photo_id !== "string")
    return apiError(400, "invalid_body", "Cuerpo JSON inválido")
  const conflict = checkRevision(s, body.revision)
  if (conflict) return conflict
  if (!store.media.has(body.photo_id))
    return apiError(404, "media_not_found", "No existe una imagen con ese id")

  s.photoId = body.photo_id
  mutate(s)
  return Response.json(toProfile(s))
}

async function readFile(
  request: Request,
): Promise<{ file: File; altText: string | null } | Response> {
  const form = await request.formData().catch(() => null)
  if (!form) return apiError(400, "invalid_form", "Se esperaba multipart/form-data")
  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0)
    return apiError(400, "missing_file", "Falta el archivo en el campo «file»")
  const alt = form.get("alt_text")
  return { file, altText: typeof alt === "string" ? alt : null }
}

export async function uploadMedia(request: Request): Promise<Response> {
  const parsed = await readFile(request)
  if (parsed instanceof Response) return parsed
  const { file, altText } = parsed
  if (!IMAGE_TYPES.has(file.type))
    return apiError(
      422,
      "unsupported_media_type",
      "La imagen tiene que ser JPEG, PNG o WebP",
    )
  if (file.size > MAX_FILE_BYTES)
    return apiError(422, "file_too_large", "La imagen no puede superar 10 MB")

  const asset: MediaAsset = {
    photo_id: `med_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    mime_type: file.type,
    alt_text: altText,
    size_bytes: file.size,
  }
  store.media.set(asset.photo_id, asset)
  return Response.json(asset, { status: 201 })
}

export async function uploadCv(
  s: StoredSession,
  request: Request,
): Promise<Response> {
  const parsed = await readFile(request)
  if (parsed instanceof Response) return parsed
  const { file } = parsed
  if (file.type !== PDF_TYPE)
    return apiError(422, "unsupported_media_type", "El CV tiene que ser un PDF")
  if (file.size > MAX_FILE_BYTES)
    return apiError(422, "file_too_large", "El CV no puede superar 10 MB")

  s.cvDocument = {
    cv_id: `cv_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    mime_type: file.type,
    size_bytes: file.size,
  }
  mutate(s)
  return Response.json(toProfile(s), { status: 201 })
}

export function getConnection(s: StoredSession, platform: Platform): Response {
  return Response.json(s.connections[platform])
}

export async function startConnection(
  s: StoredSession,
  platform: Platform,
  request: Request,
): Promise<Response> {
  if (platform === "x") {
    s.connections.x = { ...X_UNAVAILABLE }
    return Response.json(s.connections.x, { status: 503 })
  }
  const body = (await request.json().catch(() => ({}))) as {
    return_to?: string | null
  }
  const returnTo = body.return_to ?? "/onboarding"
  const authorizationUrl = `/api/v1/social/${platform}/callback?state=${encodeURIComponent(
    s.id,
  )}&return_to=${encodeURIComponent(returnTo)}`
  return Response.json({
    platform,
    authorization_url: authorizationUrl,
    state: s.id,
  })
}

export function handleCallback(
  platform: Platform,
  request: Request,
): Response {
  const url = new URL(request.url)
  const state = url.searchParams.get("state")
  const returnTo = url.searchParams.get("return_to") ?? "/onboarding"
  const error = url.searchParams.get("error")
  const session = state ? store.sessions.get(state) : undefined

  const target = new URL(returnTo, url.origin)
  if (!session || error) {
    target.searchParams.set(
      error ? "error" : "connected_error",
      error ?? platform,
    )
    return Response.redirect(target, 302)
  }
  session.connections[platform] = {
    platform,
    status: "connected",
    can_publish_text: true,
    can_publish_image: true,
    can_read_posts: true,
    account_handle: "Cuenta demo",
    reason: null,
  }
  target.searchParams.set("connected", platform)
  return Response.redirect(target, 302)
}

export async function syncStyle(
  s: StoredSession,
  request: Request,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as SyncStyleRequest
  const platforms = body.platforms ?? PLATFORMS
  const maxPosts = Math.min(body.max_posts_per_platform ?? 5, 20)

  s.voiceContext ??= {
    language: "es-AR",
    author_hint: s.profession,
    sample_posts: {},
    preferences: { use_emojis: false, use_hashtags: false },
  }
  s.voiceContext.sample_posts ??= {}

  let anySucceeded = false
  for (const platform of platforms) {
    if (!isPlatform(platform)) continue
    const conn = s.connections[platform]
    if (conn.status === "connected" && conn.can_read_posts) {
      const posts = CANNED_POSTS[platform].slice(0, maxPosts)
      s.voiceContext.sample_posts[platform] = posts
      s.styleSync[platform] = {
        status: "succeeded",
        posts_imported: posts.length,
        message: null,
      }
      anySucceeded = true
    } else {
      s.styleSync[platform] = {
        status: "unavailable",
        posts_imported: 0,
        message:
          conn.status === "connected"
            ? "can_read_posts es false en este entorno"
            : "La cuenta no está conectada",
      }
    }
  }
  s.styleSync.last_attempt_at = new Date().toISOString()
  mutate(s)
  return Response.json(toProfile(s), { status: anySucceeded ? 200 : 503 })
}

export async function completeOnboarding(
  s: StoredSession,
  request: Request,
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    revision?: number
  } | null
  if (!body) return apiError(400, "invalid_body", "Cuerpo JSON inválido")
  const conflict = checkRevision(s, body.revision)
  if (conflict) return conflict
  if (!readyForAchievement(s))
    return apiError(
      400,
      "onboarding_incomplete",
      "Faltan campos obligatorios: profesión, foto y una fuente de estilo",
    )

  s.voiceContext = {
    language: "es-AR",
    author_hint: s.profession,
    sample_posts: s.voiceContext?.sample_posts ?? {},
    preferences: { use_emojis: false, use_hashtags: false },
  }
  s.onboardingStatus = "complete"
  mutate(s)
  return Response.json(toProfile(s))
}

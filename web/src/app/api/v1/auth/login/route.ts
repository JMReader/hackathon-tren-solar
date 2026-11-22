import { matchDemoAccount } from "@/lib/auth/demo-accounts"
import { apiError, createSession, stampDemoDisplayName } from "@/lib/api/mock-store"

type LoginBody = { email?: string; password?: string }

const UPSTREAM = process.env.API_PROXY_TARGET ?? "http://localhost:8000"
const USE_UPSTREAM_SESSION = process.env.DEMO_LOGIN_UPSTREAM === "1"

async function createSessionWithProfile(displayName: string): Promise<
  { session_id: string; display_name: string } | Response
> {
  if (USE_UPSTREAM_SESSION) {
    const created = await fetch(`${UPSTREAM}/api/v1/session`, { method: "POST" })
    if (!created.ok) {
      return apiError(502, "session_unavailable", "No pudimos crear la sesión")
    }
    const body = (await created.json()) as { session_id?: string }
    const sessionId = body.session_id
    if (!sessionId) {
      return apiError(502, "session_invalid", "Respuesta de sesión inválida")
    }
    await fetch(`${UPSTREAM}/api/v1/session/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
      },
      body: JSON.stringify({
        revision: 1,
        profession: displayName,
      }),
    })
    return { session_id: sessionId, display_name: displayName }
  }

  const created = createSession()
  if (!stampDemoDisplayName(created.session_id, displayName)) {
    return apiError(500, "session_stamp_failed", "No pudimos preparar la sesión")
  }
  return { session_id: created.session_id, display_name: displayName }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null
  const email = typeof body?.email === "string" ? body.email : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!email || !password) {
    return apiError(400, "invalid_body", "Correo y contraseña son obligatorios")
  }

  const account = matchDemoAccount(email, password)
  if (!account) {
    return Response.json({ error: { code: "invalid_credentials" } }, { status: 401 })
  }

  const session = await createSessionWithProfile(account.display_name)
  if (session instanceof Response) return session

  return Response.json(session, { status: 200 })
}
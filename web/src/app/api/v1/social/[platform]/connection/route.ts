import {
  apiError,
  getConnection,
  isPlatform,
  requireSession,
  startConnection,
} from "@/lib/api/mock-store"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params
  if (!isPlatform(platform))
    return apiError(400, "unknown_platform", "Plataforma desconocida")
  const session = requireSession(request)
  if (session instanceof Response) return session
  return getConnection(session, platform)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params
  if (!isPlatform(platform))
    return apiError(400, "unknown_platform", "Plataforma desconocida")
  const session = requireSession(request)
  if (session instanceof Response) return session
  return startConnection(session, platform, request)
}

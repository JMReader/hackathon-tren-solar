import { apiError, handleCallback, isPlatform } from "@/lib/api/mock-store"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params
  if (!isPlatform(platform))
    return apiError(400, "unknown_platform", "Plataforma desconocida")
  return handleCallback(platform, request)
}

import { requireSession, toProfile, updateProfile } from "@/lib/api/mock-store"

export async function GET(request: Request) {
  const session = requireSession(request)
  if (session instanceof Response) return session
  return Response.json(toProfile(session))
}

export async function PATCH(request: Request) {
  const session = requireSession(request)
  if (session instanceof Response) return session
  return updateProfile(session, request)
}

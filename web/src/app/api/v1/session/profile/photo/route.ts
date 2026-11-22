import { requireSession, setProfilePhoto } from "@/lib/api/mock-store"

export async function PUT(request: Request) {
  const session = requireSession(request)
  if (session instanceof Response) return session
  return setProfilePhoto(session, request)
}

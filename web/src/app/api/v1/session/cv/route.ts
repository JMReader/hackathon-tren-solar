import { requireSession, uploadCv } from "@/lib/api/mock-store"

export async function POST(request: Request) {
  const session = requireSession(request)
  if (session instanceof Response) return session
  return uploadCv(session, request)
}

import { requireSession, syncStyle } from "@/lib/api/mock-store"

export async function POST(request: Request) {
  const session = requireSession(request)
  if (session instanceof Response) return session
  return syncStyle(session, request)
}

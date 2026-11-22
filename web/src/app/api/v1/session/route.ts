import { createSession } from "@/lib/api/mock-store"

export async function POST() {
  return Response.json(createSession(), { status: 201 })
}

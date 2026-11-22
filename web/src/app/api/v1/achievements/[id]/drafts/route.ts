import { generateDrafts } from "@/lib/api/mock-achievements"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return generateDrafts(request, (await params).id)
}

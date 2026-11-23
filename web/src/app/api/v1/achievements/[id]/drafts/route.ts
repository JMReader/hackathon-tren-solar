import { generateDrafts, listDrafts } from "@/lib/api/mock-achievements"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return generateDrafts(request, (await params).id)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return listDrafts(request, (await params).id)
}

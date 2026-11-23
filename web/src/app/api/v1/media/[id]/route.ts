import { getMediaFile } from "@/lib/api/mock-store"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getMediaFile(request, (await params).id)
}

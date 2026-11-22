import { uploadMedia } from "@/lib/api/mock-store"

export async function POST(request: Request) {
  return uploadMedia(request)
}

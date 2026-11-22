import { getDraft, updateDraft } from "@/lib/api/mock-achievements"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  return getDraft(request, (await params).id)
}

export async function PATCH(request: Request, { params }: Params) {
  return updateDraft(request, (await params).id)
}

import { getAchievement, updateAchievement } from "@/lib/api/mock-achievements"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  return getAchievement(request, (await params).id)
}

export async function PATCH(request: Request, { params }: Params) {
  return updateAchievement(request, (await params).id)
}

import { approveAchievement } from "@/lib/api/mock-achievements"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return approveAchievement(request, (await params).id)
}

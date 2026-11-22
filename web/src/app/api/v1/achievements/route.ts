import { createAchievement } from "@/lib/api/mock-achievements"

export async function POST(request: Request) {
  return createAchievement(request)
}

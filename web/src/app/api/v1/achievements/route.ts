import { createAchievement, listAchievements } from "@/lib/api/mock-achievements"

export async function GET(request: Request) {
  return listAchievements(request)
}

export async function POST(request: Request) {
  return createAchievement(request)
}

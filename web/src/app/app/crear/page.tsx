import type { Metadata } from "next"
import { CreateAchievement } from "@/components/app/create"

export const metadata: Metadata = { title: "Contá tu logro" }

export default function CreatePage() {
  return <CreateAchievement />
}

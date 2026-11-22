import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/app/common"
import { ReviewAchievement } from "@/components/app/review"

export const metadata: Metadata = { title: "Revisá tu logro" }

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReviewAchievement />
    </Suspense>
  )
}

import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/app/common"
import { PublishAchievement } from "@/components/app/publish"

export const metadata: Metadata = { title: "Tus posts" }

export default function PublishPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublishAchievement />
    </Suspense>
  )
}

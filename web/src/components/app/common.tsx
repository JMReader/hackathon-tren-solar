"use client"

import { ArrowRight, UserRound } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonStyles } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile, useSessionId } from "@/lib/api/hooks"
import type { Achievement, AchievementStatus, FactCategory } from "@/lib/api/types"

export function useAppSession() {
  const session = useSessionId()
  const profile = useProfile(session.data)
  return {
    sessionId: session.data,
    profile: profile.data,
    isLoading: session.isPending || (Boolean(session.data) && profile.isPending),
    isError: session.isError || profile.isError,
    ready: Boolean(profile.data?.ready_for_achievement && profile.data.onboarding_status === "complete"),
  }
}

export function NeedsOnboarding({ compact = false }: { compact?: boolean }) {
  return (
    <Card variant="muted" className="gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-ink-muted shadow-raised">
        <UserRound aria-hidden className="size-5" />
      </span>
      <div className="flex-1">
        <p className="text-[15px] font-medium text-ink">Primero, completá tu perfil</p>
        {!compact && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Tu profesión, tu foto y cómo escribís. Así los posts suenan a vos.
          </p>
        )}
      </div>
      <Link href="/onboarding" className={buttonStyles({ variant: "dark" })}>
        Completar perfil <ArrowRight aria-hidden />
      </Link>
    </Card>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-2/3 rounded-xl" />
      <Skeleton className="h-4 w-1/2 rounded-md" />
      <Skeleton className="mt-4 h-64 w-full rounded-[22px]" />
    </div>
  )
}

const STATUS: Record<AchievementStatus, { label: string; variant: "accent" | "neutral" | "default" | "danger" }> = {
  processing: { label: "Procesando", variant: "neutral" },
  needs_review: { label: "Para revisar", variant: "accent" },
  approved: { label: "Aprobado", variant: "default" },
  failed: { label: "No se pudo procesar", variant: "danger" },
}

export function StatusBadge({ status }: { status: AchievementStatus }) {
  const s = STATUS[status]
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export const CATEGORY_LABEL: Record<FactCategory, string> = {
  project: "Proyecto",
  role: "Tu rol",
  tech: "Herramientas",
  impact: "Impacto",
  date: "Cuándo",
  learning: "Aprendizaje",
  context: "Contexto",
}

export function achievementTitle(a: Achievement) {
  const text = a.facts[0]?.text ?? a.transcript
  return text.length > 90 ? `${text.slice(0, 88).trimEnd()}…` : text || "Logro sin título"
}

export function achievementHref(a: Achievement) {
  return a.status === "approved" ? `/app/crear/${a.id}/publicar` : `/app/crear/${a.id}/revisar`
}

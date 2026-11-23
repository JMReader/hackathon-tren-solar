"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, LayoutTemplate } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { buttonStyles } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { apiFetch, getAccountName } from "@/lib/api/client"
import { usePhotoUrls } from "@/lib/use-photo-url"
import type { Achievement, AuthorProfile } from "@/lib/api/types"
import { useProfile, useSessionId } from "@/lib/api/hooks"
import { buildEditorPreview, defaultAchievementTitle } from "../build-preview"
import { demoPortfolio } from "../demo"
import {
  createPortfolio,
  fetchCurrentPortfolio,
  publishPortfolio,
  updatePortfolio,
  type PortfolioRecord,
} from "../portfolio-api"
import { setStoredPortfolioId } from "../storage"
import { CvGate } from "./cv-gate"
import { PortfolioEditor } from "./editor"

const toItem = (a: Achievement) => ({
  achievement_id: a.id,
  title: defaultAchievementTitle(a),
  occurred_on: null,
  show_photo: true,
})

async function loadOrCreatePortfolio(
  profile: AuthorProfile,
  approved: Achievement[],
): Promise<PortfolioRecord> {
  const current = await fetchCurrentPortfolio()
  if (current) {
    setStoredPortfolioId(current.id)
    return current
  }
  const account = getAccountName()?.trim()
  const displayName =
    account && account.length >= 2
      ? account
      : (profile.profession?.trim().length ?? 0) >= 2
        ? profile.profession!.trim()
        : "Tu portfolio"
  const created = await createPortfolio({
    display_name: displayName,
    headline: profile.profession,
    items: approved.slice(0, 12).map(toItem),
    template_id: "esencial",
    palette_id: "azul-salina",
    cv_downloadable: false,
  })
  setStoredPortfolioId(created.id)
  return created
}

function EmptyPortfolio() {
  return (
    <div className="flex flex-1 flex-col px-4 lg:px-14 lg:pt-12 xl:px-20">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-[22px] bg-paper p-6 shadow-raised lg:max-w-[1120px] lg:bg-transparent lg:p-0 lg:shadow-none">
        <h1 className="font-display text-[28px] leading-tight tracking-display text-ink lg:text-[40px]">Tu portfolio</h1>
        <div className="flex flex-col gap-4 rounded-[22px] bg-sunken p-6 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-ink-muted shadow-raised">
            <LayoutTemplate aria-hidden className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink">Se arma solo con tus logros aprobados</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Contá un logro, revisalo y aprobalo: aparece acá y elegís plantilla y colores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/p/${demoPortfolio.slug}`} target="_blank" className={buttonStyles({ variant: "ghost" })}>
              Ver un ejemplo
            </Link>
            <Link href="/app/crear" className={buttonStyles({ variant: "dark" })}>
              Contar un logro <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PortfolioEditorShell({ embedded = false }: { embedded?: boolean }) {
  const session = useSessionId()
  const sessionId = session.data
  const profileQuery = useProfile(sessionId)
  const [showExample, setShowExample] = useState(false)
  const cvId = profileQuery.data?.cv_document?.cv_id ?? null

  const achievementsQuery = useQuery({
    queryKey: ["achievements", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => apiFetch<Achievement[]>("/achievements"),
  })

  const approved = (achievementsQuery.data ?? []).filter((a) => a.status === "approved")
  const photoUrls = usePhotoUrls([profileQuery.data?.photo_id, ...approved.map((a) => a.photo_id)])
  const useDemo =
    !session.isPending &&
    !achievementsQuery.isLoading &&
    (!sessionId || approved.length === 0)

  const portfolioQuery = useQuery({
    queryKey: ["portfolio-draft", sessionId, approved.map((a) => a.id).join(","), cvId],
    enabled: Boolean(sessionId && profileQuery.data && approved.length > 0),
    queryFn: () => loadOrCreatePortfolio(profileQuery.data!, approved),
  })

  if (session.isPending || profileQuery.isLoading || (sessionId && achievementsQuery.isLoading)) {
    return (
      <div className={embedded ? "flex flex-1 items-center justify-center py-24" : "flex min-h-dvh items-center justify-center bg-night"}>
        <Spinner className="size-8 text-on-dark" />
      </div>
    )
  }

  if (showExample) {
    return <PortfolioEditor portfolio={demoPortfolio} isDemo embedded={embedded} />
  }

  if (sessionId && profileQuery.data && !cvId) {
    return <CvGate sessionId={sessionId} embedded={embedded} onExample={() => setShowExample(true)} />
  }

  if (useDemo) {
    return embedded ? <EmptyPortfolio /> : <PortfolioEditor portfolio={demoPortfolio} isDemo />
  }

  if (portfolioQuery.isLoading || !portfolioQuery.data || !profileQuery.data) {
    return (
      <div className={embedded ? "flex flex-1 items-center justify-center py-24" : "flex min-h-dvh items-center justify-center bg-night"}>
        <Spinner className="size-8 text-on-dark" />
      </div>
    )
  }

  if (portfolioQuery.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-night px-6 text-center text-on-dark">
        No pudimos cargar tu portfolio. Revisá que el API esté en marcha y recargá la página.
      </div>
    )
  }

  const record = portfolioQuery.data
  const preview = buildEditorPreview(
    record,
    profileQuery.data,
    approved,
    record.template_id,
    record.palette_id,
    record.cv_downloadable,
    (photoId) => (photoId ? (photoUrls.get(photoId) ?? null) : null),
  )

  async function persist(patch: Omit<Parameters<typeof updatePortfolio>[1], "revision">) {
    const latest = portfolioQuery.data!
    const next = await updatePortfolio(latest.id, { ...patch, revision: latest.revision })
    setStoredPortfolioId(next.id)
    await portfolioQuery.refetch()
    return next
  }

  return (
    <PortfolioEditor
      key={`${record.id}-${record.revision}`}
      portfolio={preview}
      isDemo={false}
      embedded={embedded}
      publicSlug={record.status === "published" && record.slug && record.published_revision === record.revision ? record.slug : null}
      outdatedSlug={record.status === "published" && record.published_revision !== record.revision ? record.slug : null}
      hasCv={record.has_cv}
      onTemplateChange={async (templateId) => {
        await persist({ template_id: templateId })
      }}
      onPaletteChange={async (paletteId) => {
        await persist({ palette_id: paletteId })
      }}
      onCvDownloadableChange={async (cvDownloadable) => {
        await persist({ cv_downloadable: cvDownloadable })
      }}
      onPublish={async () => {
        const latest = portfolioQuery.data!
        const published = await publishPortfolio(latest.id, latest.revision)
        setStoredPortfolioId(published.id)
        await portfolioQuery.refetch()
        if (published.slug) window.open(`/p/${published.slug}`, "_blank")
      }}
    />
  )
}
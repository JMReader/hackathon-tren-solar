"use client"

import { useQuery } from "@tanstack/react-query"
import { Spinner } from "@/components/ui/spinner"
import { apiFetch } from "@/lib/api/client"
import type { Achievement, AuthorProfile } from "@/lib/api/types"
import { useProfile, useSessionId } from "@/lib/api/hooks"
import { buildEditorPreview, defaultAchievementTitle } from "../build-preview"
import { demoPortfolio } from "../demo"
import {
  createPortfolio,
  fetchPortfolio,
  publishPortfolio,
  updatePortfolio,
  type PortfolioRecord,
} from "../portfolio-api"
import { clearStoredPortfolioId, getStoredPortfolioId, setStoredPortfolioId } from "../storage"
import { PortfolioEditor } from "./editor"

async function loadOrCreatePortfolio(
  profile: AuthorProfile,
  approved: Achievement[],
): Promise<PortfolioRecord> {
  const storedId = getStoredPortfolioId()
  if (storedId) {
    try {
      return await fetchPortfolio(storedId)
    } catch {
      clearStoredPortfolioId()
    }
  }
  const displayName =
    (profile.profession?.trim().length ?? 0) >= 2
      ? profile.profession!.trim()
      : "Tu portfolio"
  const created = await createPortfolio({
    display_name: displayName,
    headline: profile.profession,
    items: approved.map((a) => ({
      achievement_id: a.id,
      title: defaultAchievementTitle(a),
      occurred_on: null,
      show_photo: true,
    })),
    template_id: "esencial",
    palette_id: "azul-salina",
    cv_downloadable: false,
  })
  setStoredPortfolioId(created.id)
  return created
}

export function PortfolioEditorShell() {
  const session = useSessionId()
  const sessionId = session.data
  const profileQuery = useProfile(sessionId)

  const achievementsQuery = useQuery({
    queryKey: ["achievements", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => apiFetch<Achievement[]>("/achievements"),
  })

  const approved = (achievementsQuery.data ?? []).filter((a) => a.status === "approved")
  const useDemo =
    !session.isPending &&
    !achievementsQuery.isLoading &&
    (!sessionId || approved.length === 0)

  const portfolioQuery = useQuery({
    queryKey: ["portfolio-draft", sessionId, approved.map((a) => a.id).join(",")],
    enabled: Boolean(sessionId && profileQuery.data && approved.length > 0),
    queryFn: () => loadOrCreatePortfolio(profileQuery.data!, approved),
  })

  if (session.isPending || profileQuery.isLoading || (sessionId && achievementsQuery.isLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-night">
        <Spinner className="size-8 text-on-dark" />
      </div>
    )
  }

  if (useDemo) {
    return <PortfolioEditor portfolio={demoPortfolio} isDemo />
  }

  if (portfolioQuery.isLoading || !portfolioQuery.data || !profileQuery.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-night">
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
      publicSlug={record.status === "published" && record.slug ? record.slug : null}
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
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getPublicPortfolio, withDemoOverrides } from "@/portfolio/api"
import { findDemoPortfolio } from "@/portfolio/demo"
import { PortfolioView } from "@/portfolio/templates"

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false },
}

export default function PublicPortfolioPage(props: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <PublicPortfolio {...props} />
    </Suspense>
  )
}

async function PublicPortfolio({ params, searchParams }: PageProps<"/p/[slug]">) {
  const { slug } = await params
  const { plantilla, paleta } = await searchParams
  const portfolio = await getPublicPortfolio(slug)
  if (!portfolio) notFound()

  const isDemo = Boolean(findDemoPortfolio(slug))
  const shown = withDemoOverrides(portfolio, single(plantilla), single(paleta))

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {isDemo && (
        <p className="bg-night px-4 py-2 text-center text-[13px] text-on-dark">
          Portfolio de ejemplo con datos inventados.
        </p>
      )}
      <div className="flex flex-1 flex-col">
        <PortfolioView portfolio={shown} />
      </div>
    </div>
  )
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

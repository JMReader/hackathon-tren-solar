"use client"

import { ArrowRight, BriefcaseBusiness, ChevronRight, LayoutTemplate, Mic } from "lucide-react"
import Link from "next/link"
import { Orb } from "@/components/audio/orb"
import { buttonStyles } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAchievementEntries, useAchievementList, useStoredPortfolio } from "@/lib/api/achievements"
import { cn } from "@/lib/utils"
import {
  NeedsOnboarding,
  PageSkeleton,
  StatusBadge,
  achievementHref,
  achievementTitle,
  useAppSession,
} from "./common"
import { AppPage, PageTitle } from "./shell"

const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function AppHome() {
  const { sessionId, profile, isLoading, ready } = useAppSession()
  const entries = useAchievementEntries(sessionId)
  const list = useAchievementList(sessionId)
  const achievements = list.data ?? []
  const createdAt = new Map(entries.map((e) => [e.id, e.createdAt]))
  const approvedCount = achievements.filter((a) => a.status === "approved").length
  // Without approved achievements there is no portfolio yet: skip the 404 from /portfolios/current.
  const portfolio = useStoredPortfolio(sessionId, approvedCount > 0)

  if (isLoading || !profile)
    return (
      <AppPage>
        <PageSkeleton />
      </AppPage>
    )

  return (
    <AppPage className="gap-8">
      <PageTitle
        title="Tu espacio"
        lead="Hola. Acá están tus logros y los posts que armamos con ellos."
      />

      {!ready && <NeedsOnboarding />}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card variant="dark" className="relative overflow-hidden bg-night p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
            <Orb state="idle" inverted className="mx-auto size-36 shrink-0 sm:mx-0 sm:size-40" label="Listo para grabar" />
            <div className="mt-6 flex flex-1 flex-col gap-3 text-center sm:mt-0 sm:text-left">
              <p className="font-display text-[26px] leading-tight tracking-display text-inverse sm:text-[30px]">
                Contá tu próximo logro
              </p>
              <p className="text-sm leading-relaxed text-on-dark">
                Un audio de un par de minutos alcanza. Lo ordenamos en hechos con su cita y te armamos un post para
                LinkedIn y otro para X.
              </p>
              <div className="mt-2 flex justify-center sm:justify-start">
                {ready ? (
                  <Link href="/app/crear" className={buttonStyles({ size: "lg" })}>
                    <Mic aria-hidden /> Grabar logro
                  </Link>
                ) : (
                  <span className={cn(buttonStyles({ size: "lg" }), "pointer-events-none opacity-45")} aria-disabled="true">
                    <Mic aria-hidden /> Grabar logro
                  </span>
                )}
              </div>
            </div>
          </Card>

          <section aria-labelledby="logros" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id="logros" className="text-[15px] font-medium text-ink">
                Tus logros
              </h2>
              {achievements.length > 0 && <span className="text-xs text-ink-muted tabular-nums">{achievements.length}</span>}
            </div>
            {list.isPending ? (
              <Card className="gap-3 p-5">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </Card>
            ) : list.isError ? (
              <Card variant="muted" className="p-5 text-[13px] text-ink-muted">
                No pudimos cargar tus logros. Recargá la página.
              </Card>
            ) : achievements.length === 0 ? (
              <Card variant="muted" className="items-start gap-2 p-5">
                <p className="text-sm text-ink">Todavía no contaste ningún logro.</p>
                <p className="text-[13px] text-ink-muted">
                  Cuando grabes el primero, va a aparecer acá para revisarlo o copiar sus posts.
                </p>
              </Card>
            ) : (
              <Card className="divide-y divide-divider overflow-hidden p-0">
                {achievements.map((a) => {
                  const when = createdAt.get(a.id)
                  return (
                    <Link
                      key={a.id}
                      href={achievementHref(a)}
                      className="focus-ring group flex items-center gap-4 px-5 py-4 hover:bg-fill-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm leading-snug text-ink">{achievementTitle(a)}</span>
                        <span className="mt-1 block text-xs text-ink-muted">
                          {when ? `${dateFormat.format(new Date(when))} · ` : ""}
                          {a.facts.length} hecho{a.facts.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                      <ChevronRight aria-hidden className="size-4 text-ink-faint group-hover:text-ink" />
                    </Link>
                  )
                })}
              </Card>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card variant="muted" className="gap-2 p-5">
            <p className="text-[13px] font-medium text-ink">Tu voz</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {profile.profession ?? "Sin profesión"} ·{" "}
              {(profile.style_sync.linkedin.posts_imported ?? 0) + (profile.style_sync.x.posts_imported ?? 0) > 0
                ? "tono de tus posts importados"
                : profile.writing_sample
                  ? "tono de tu muestra de voz"
                  : "todavía sin muestra"}
            </p>
            <Link href="/onboarding?step=2" className="mt-1 self-start text-[13px] font-medium text-accent-strong hover:underline">
              Editar mi voz
            </Link>
          </Card>
          <Card variant="muted" className="gap-3 p-5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <LayoutTemplate aria-hidden className="size-4" /> Tu portfolio
            </span>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {portfolio.data?.status === "published"
                ? portfolio.data.published_revision === portfolio.data.revision
                  ? `Publicado con ${portfolio.data.items.length} logro${portfolio.data.items.length === 1 ? "" : "s"}. Al armar los posts de un logro te preguntamos si lo sumás.`
                  : "Publicado, con cambios nuevos sin publicar. Abrilo y tocá «Actualizar página»."
                : approvedCount > 0
                  ? `${approvedCount} logro${approvedCount === 1 ? " aprobado listo" : "s aprobados listos"} para mostrar. Elegí plantilla y colores.`
                  : "Se arma solo con tus logros aprobados. Elegí plantilla y colores."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/app/portfolio" className={cn(buttonStyles({ variant: "outline", size: "sm" }), "self-start")}>
                {portfolio.data ? "Editar portfolio" : "Armar portfolio"} <ArrowRight aria-hidden />
              </Link>
              {portfolio.data?.status === "published" && portfolio.data.slug && (
                <Link href={`/p/${portfolio.data.slug}`} target="_blank" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Ver página
                </Link>
              )}
            </div>
          </Card>
          <Card variant="muted" className="gap-3 p-5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <BriefcaseBusiness aria-hidden className="size-4" /> Ofertas y empresas
            </span>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Mirá ofertas que encajan con tus logros aprobados y cómo te encuentran las empresas.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/app/ofertas" className={cn(buttonStyles({ variant: "outline", size: "sm" }), "self-start")}>
                Ver ofertas <ArrowRight aria-hidden />
              </Link>
              <Link href="/empresas" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                Vista de empresas
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </AppPage>
  )
}

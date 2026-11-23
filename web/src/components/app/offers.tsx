"use client"

import { ArrowRight, BriefcaseBusiness, MapPin } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonStyles } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAchievementList } from "@/lib/api/achievements"
import type { Achievement } from "@/lib/api/types"
import { PageSkeleton, useAppSession } from "./common"
import { AppPage, PageTitle } from "./shell"

// Example offers for the demo: there is no live job feed yet (JobSpy/Computrabajo would plug in here).
const OFFERS = [
  { id: "o1", title: "Diseño UX/UI junior", org: "Estudio de producto (ejemplo)", place: "Remoto · Argentina", skills: ["figma", "diseño", "ux", "ui", "pantallas", "prototipo", "flujo"] },
  { id: "o2", title: "Desarrollo web frontend", org: "Software factory (ejemplo)", place: "Remoto · LATAM", skills: ["react", "next", "javascript", "typescript", "web", "frontend", "landing", "html", "css"] },
  { id: "o3", title: "Soporte técnico y datos", org: "Cooperativa regional (ejemplo)", place: "Híbrido · San Salvador de Jujuy", skills: ["datos", "base de datos", "excel", "sql", "soporte", "sistema", "python"] },
  { id: "o4", title: "Community manager", org: "Turismo en la Quebrada (ejemplo)", place: "Remoto · Jujuy", skills: ["redes", "contenido", "instagram", "linkedin", "fotos", "comunicación", "marketing"] },
  { id: "o5", title: "Tienda online y e-commerce", org: "Emprendimientos textiles (ejemplo)", place: "Por proyecto · Remoto", skills: ["tienda", "e-commerce", "catálogo", "ventas", "whatsapp", "pedidos", "shopify"] },
  { id: "o6", title: "Desarrollo backend junior", org: "Fintech (ejemplo)", place: "Remoto · Argentina", skills: ["python", "api", "fastapi", "node", "backend", "postgres", "sql", "base de datos"] },
]

function match(offer: (typeof OFFERS)[number], achievements: Achievement[]) {
  const hits: { skill: string; fact: string }[] = []
  for (const skill of offer.skills) {
    for (const a of achievements) {
      const fact = a.facts.find((f) => f.text.toLowerCase().includes(skill))
      if (fact) {
        hits.push({ skill, fact: fact.text })
        break
      }
    }
  }
  return hits
}

export function Offers() {
  const { sessionId, isLoading } = useAppSession()
  const list = useAchievementList(sessionId)
  const approved = (list.data ?? []).filter((a) => a.status === "approved")
  const ranked = OFFERS.map((o) => ({ offer: o, hits: match(o, approved) }))
    .filter((r) => r.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length)

  return (
    <AppPage className="gap-6">
      <PageTitle
        title="Ofertas para vos"
        lead="Las sugerimos según lo que aprobaste en tus logros. Cada una muestra qué hecho tuyo coincide."
        eyebrow={<Badge variant="neutral" className="mb-3">Ofertas de ejemplo</Badge>}
      />
      {isLoading || list.isPending ? (
        <PageSkeleton />
      ) : approved.length === 0 ? (
        <Card variant="muted" className="items-start gap-3 p-5">
          <p className="text-sm text-ink">Todavía no hay logros aprobados para comparar.</p>
          <p className="text-[13px] text-ink-muted">Contá un logro y aprobalo: con sus hechos buscamos ofertas que encajen.</p>
          <Link href="/app/crear" className={buttonStyles({ variant: "dark", size: "sm" })}>
            Contar un logro <ArrowRight aria-hidden />
          </Link>
        </Card>
      ) : ranked.length === 0 ? (
        <Card variant="muted" className="gap-2 p-5">
          <p className="text-sm text-ink">No encontramos coincidencias con tus logros todavía.</p>
          <p className="text-[13px] text-ink-muted">Sumá más logros, contando qué herramientas usaste y qué hiciste vos.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ranked.map(({ offer, hits }) => (
            <Card key={offer.id} className="gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-muted">
                  <BriefcaseBusiness aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">{offer.title}</p>
                  <p className="text-[13px] text-ink-muted">{offer.org}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                    <MapPin aria-hidden className="size-3.5" /> {offer.place}
                  </p>
                </div>
                <Badge variant="accent">
                  {hits.length} coincidencia{hits.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <ul className="flex flex-col gap-2 border-t border-divider pt-3">
                {hits.slice(0, 3).map((h) => (
                  <li key={h.skill} className="text-[13px] leading-relaxed text-ink-muted">
                    <span className="font-medium text-ink">{h.skill}</span> · «{h.fact}»
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-muted">
        Son ofertas de ejemplo para la demo. Con tu permiso en el perfil, las empresas también pueden encontrarte en{" "}
        <Link href="/empresas" className="underline">
          chambeAR Empresas
        </Link>
        .
      </p>
    </AppPage>
  )
}

import { AudioLines, FileDown, GitPullRequest, PenLine } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { firstName, initials } from "./theme"
import type { FactCategory, FactSource, PublicPortfolio } from "./types"

const origins: Record<FactSource, { icon: typeof AudioLines; label: string }> = {
  transcript: { icon: AudioLines, label: "Lo contó por audio" },
  user: { icon: PenLine, label: "Lo sumó al revisar" },
  mcp: { icon: GitPullRequest, label: "Viene de su repositorio" },
}

const categoryLabels: Record<FactCategory, string> = {
  project: "Proyecto",
  role: "Rol",
  tech: "Tecnología",
  impact: "Resultado",
  date: "Fecha",
  learning: "Aprendizaje",
  context: "Contexto",
}

export function factLabel(category: FactCategory | undefined) {
  return category ? categoryLabels[category] : null
}

export function FactOrigin({ source, className }: { source: FactSource; className?: string }) {
  const { icon: Icon, label } = origins[source]
  return (
    <span className={cn("inline-flex h-[1lh] shrink-0 items-center self-start text-(--pf-accent)", className)} title={label}>
      <Icon aria-hidden className="size-[1em]" strokeWidth={2} />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function OriginLegend({ portfolio, className }: { portfolio: PublicPortfolio; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 text-[13px] leading-snug text-(--pf-muted)", className)}>
      <Approved portfolio={portfolio} />
      <OriginKey portfolio={portfolio} />
    </div>
  )
}

export function Portrait({ portfolio, className }: { portfolio: PublicPortfolio; className?: string }) {
  if (!portfolio.photo_url) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={portfolio.photo_url} alt={`Foto de ${portfolio.display_name}`} className={cn("object-cover", className)} />
}

export function Monogram({ portfolio, className }: { portfolio: PublicPortfolio; className?: string }) {
  return (
    <span aria-hidden className={cn("select-none", className)}>
      {initials(portfolio.display_name)}
    </span>
  )
}

export function Approved({ portfolio, className }: { portfolio: PublicPortfolio; className?: string }) {
  return <p className={className}>{firstName(portfolio.display_name)} revisó cada dato de esta página antes de publicarla.</p>
}

export function OriginKey({ portfolio, className }: { portfolio: PublicPortfolio; className?: string }) {
  const used = new Set(portfolio.items.flatMap((item) => item.facts.map((fact) => fact.source)))
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1.5", className)}>
      {(Object.keys(origins) as FactSource[])
        .filter((source) => used.has(source))
        .map((source) => (
          <li key={source} className="inline-flex items-center gap-1.5">
            <FactOrigin source={source} />
            {origins[source].label}
          </li>
        ))}
    </ul>
  )
}

export function CvLink({ portfolio, className, ...props }: { portfolio: PublicPortfolio } & ComponentProps<"a">) {
  if (!portfolio.cv_url) return null
  return (
    <a
      href={portfolio.cv_url}
      className={cn(
        "inline-flex h-11 w-fit items-center gap-2 rounded-full bg-(--pf-accent) px-5 text-[15px] font-medium text-(--pf-on-accent) transition-transform duration-150 ease-out active:scale-[0.97]",
        className,
      )}
      {...props}
    >
      <FileDown aria-hidden className="size-4" />
      Descargar CV
    </a>
  )
}

export function MadeWith({ className }: { className?: string }) {
  return <p className={cn("text-xs text-(--pf-muted)", className)}>Hecho con Tren Solar.</p>
}

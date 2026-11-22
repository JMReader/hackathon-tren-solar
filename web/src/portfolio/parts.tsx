import { AudioLines, FileDown, GitPullRequest, PenLine } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { firstName, initials } from "./theme"
import type { FactSource, PublicPortfolio } from "./types"

const origins: Record<FactSource, { icon: typeof AudioLines; label: string }> = {
  transcript: { icon: AudioLines, label: "Lo contó en un audio" },
  user: { icon: PenLine, label: "Lo agregó al revisar" },
  mcp: { icon: GitPullRequest, label: "Lo trajo de su repositorio" },
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
  const used = new Set(portfolio.items.flatMap((item) => item.facts.map((fact) => fact.source)))
  return (
    <div className={cn("flex flex-col gap-1.5 text-[13px] leading-snug text-(--pf-muted)", className)}>
      <p>{firstName(portfolio.display_name)} revisó y aprobó cada hecho de esta página.</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(origins) as FactSource[])
          .filter((source) => used.has(source))
          .map((source) => (
            <li key={source} className="inline-flex items-center gap-1.5">
              <FactOrigin source={source} />
              {origins[source].label}
            </li>
          ))}
      </ul>
    </div>
  )
}

export function Portrait({ portfolio, className }: { portfolio: PublicPortfolio; className?: string }) {
  if (portfolio.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={portfolio.photo_url} alt={`Foto de ${portfolio.display_name}`} className={cn("object-cover", className)} />
  }
  return (
    <span
      aria-hidden
      className={cn("grid place-items-center bg-(--pf-accent) font-medium text-(--pf-on-accent) select-none", className)}
    >
      {initials(portfolio.display_name)}
    </span>
  )
}

export function CvLink({ portfolio, className, ...props }: { portfolio: PublicPortfolio } & ComponentProps<"a">) {
  if (!portfolio.cv_url) return null
  return (
    <a
      href={portfolio.cv_url}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full bg-(--pf-accent) px-5 text-[15px] font-medium text-(--pf-on-accent) transition-transform duration-150 ease-out outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--pf-accent) active:scale-[0.97]",
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
  return <p className={cn("text-xs text-(--pf-muted)", className)}>Hecho con Tren Solar a partir de audios.</p>
}

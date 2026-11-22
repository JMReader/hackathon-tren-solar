import { cn } from "@/lib/utils"
import { CvLink, FactOrigin, MadeWith, OriginLegend } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const frame = "mx-auto w-full max-w-[80rem] px-6 @2xl:px-10"
const strata = [
  "bg-(--pf-accent) text-(--pf-on-accent)",
  "bg-(--pf-ink) text-(--pf-bg)",
  "bg-(--pf-surface) text-(--pf-ink)",
]

export function Estratos({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio}>
      <header className={cn(frame, "flex flex-wrap items-end justify-between gap-6 pt-12 pb-10 @5xl:pt-20 @5xl:pb-14")}>
        <div>
          <h1 className="pf-rise font-(family-name:--font-bricolage) text-[clamp(3.25rem,12cqi,6rem)] leading-[0.9] font-bold tracking-[-0.04em] text-balance">
            {portfolio.display_name}
          </h1>
          {portfolio.headline && <p className="mt-4 text-xl text-(--pf-muted)">{portfolio.headline}</p>}
        </div>
        <CvLink portfolio={portfolio} />
      </header>

      {portfolio.items.map((item, index) => (
        <section key={item.title} className={strata[index % strata.length]}>
          <div className={cn(frame, "grid gap-x-16 gap-y-8 py-14 @4xl:grid-cols-[5fr_7fr] @5xl:py-20")}>
            <div>
              <p className="text-sm tabular-nums opacity-80">{formatOccurredOn(item.occurred_on)}</p>
              <h2 className="mt-3 font-(family-name:--font-bricolage) text-[clamp(2rem,6cqi,3.5rem)] leading-[1] font-semibold tracking-[-0.03em] text-balance">
                {item.title}
              </h2>
            </div>
            <ul className="flex flex-col">
              {item.facts.map((fact) => (
                <li key={fact.text} className="flex gap-3 border-t border-current/20 py-5 text-xl leading-snug text-pretty first:border-t-0 first:pt-0">
                  <FactOrigin source={fact.source} className="text-current" />
                  {fact.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <footer className={cn(frame, "flex flex-wrap items-start justify-between gap-6 py-8")}>
        <OriginLegend portfolio={portfolio} />
        <MadeWith />
      </footer>
    </TemplateShell>
  )
}

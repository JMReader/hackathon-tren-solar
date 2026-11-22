import { cn } from "@/lib/utils"
import { CvLink, FactOrigin, MadeWith, OriginLegend } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const frame = "mx-auto w-full max-w-[84rem] px-6 @2xl:px-12"
const slides = ["bg-(--pf-bg) text-(--pf-ink)", "bg-(--pf-accent) text-(--pf-on-accent)", "bg-(--pf-ink) text-(--pf-bg)"]

export function Presentacion({ portfolio }: TemplateProps) {
  const total = portfolio.items.length
  return (
    <TemplateShell portfolio={portfolio}>
      <section className={cn(frame, "flex min-h-[34rem] flex-col justify-between gap-12 py-10 @5xl:min-h-[40rem] @5xl:py-14")}>
        <p className="text-sm text-(--pf-muted)">{portfolio.headline}</p>
        <h1 className="pf-rise font-(family-name:--font-bricolage) text-[clamp(3.5rem,14cqi,6rem)] leading-[0.88] font-bold tracking-[-0.04em] text-balance">
          {portfolio.display_name}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-lg text-(--pf-muted)">{total === 1 ? "Un logro" : `${total} logros`}, uno por pantalla.</p>
          <CvLink portfolio={portfolio} />
        </div>
      </section>

      {portfolio.items.map((item, index) => (
        <section key={item.title} className={slides[(index + 1) % slides.length]}>
          <div className={cn(frame, "flex min-h-[34rem] flex-col justify-between gap-12 py-10 @5xl:min-h-[40rem] @5xl:py-14")}>
            <p className="flex justify-between text-sm tabular-nums opacity-80">
              <span>{formatOccurredOn(item.occurred_on)}</span>
              <span>
                {index + 1} de {total}
              </span>
            </p>
            <h2 className="max-w-[18ch] font-(family-name:--font-bricolage) text-[clamp(2.5rem,8.5cqi,5.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-balance">
              {item.title}
            </h2>
            <ul className="grid gap-x-12 gap-y-5 @4xl:grid-cols-2">
              {item.facts.map((fact) => (
                <li key={fact.text} className="flex gap-3 border-t border-current/25 pt-4 text-xl leading-snug text-pretty">
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

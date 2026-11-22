import { cn } from "@/lib/utils"
import { CvLink, FactOrigin, MadeWith, OriginLegend, Portrait } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

export function Caso({ portfolio }: TemplateProps) {
  const [lead, ...rest] = portfolio.items
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10 @2xl:px-10 @2xl:py-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Portrait portfolio={portfolio} className="size-10 shrink-0 rounded-full text-sm" />
            <p className="leading-tight">
              <span className="block font-semibold">{portfolio.display_name}</span>
              {portfolio.headline && <span className="block text-sm text-(--pf-muted)">{portfolio.headline}</span>}
            </p>
          </div>
          <CvLink portfolio={portfolio} />
        </header>

        {lead && (
          <section className={cn("mt-14 grid gap-10", lead.photo_url && "@5xl:grid-cols-[1.1fr_1fr] @5xl:items-end")}>
            <div>
              {lead.occurred_on && <p className="text-sm text-(--pf-muted)">{formatOccurredOn(lead.occurred_on)}</p>}
              <h2 className="mt-3 font-display text-[clamp(2.5rem,6.5cqi,4.75rem)] leading-[0.98] font-light tracking-[-0.04em] text-balance @5xl:max-w-[14ch]">
                {lead.title}
              </h2>
            </div>
            {lead.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lead.photo_url} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover" />
            )}
            <ul className={cn("flex flex-col gap-5 @5xl:grid @5xl:grid-cols-2 @5xl:gap-x-10", lead.photo_url && "@5xl:col-span-2")}>
              {lead.facts.map((fact) => (
                <li key={fact.text} className="flex gap-3 text-xl leading-relaxed text-pretty">
                  <FactOrigin source={fact.source} />
                  {fact.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-16 border-t border-(--pf-ink)/12 pt-8">
            <h2 className="text-sm font-semibold text-(--pf-muted)">Otros logros</h2>
            <ul className="mt-4 grid gap-x-10 gap-y-6 @2xl:grid-cols-2">
              {rest.map((item) => (
                <li key={item.title}>
                  <h3 className="text-lg leading-snug font-semibold tracking-[-0.01em] text-balance">{item.title}</h3>
                  {item.facts[0] && (
                    <p className="mt-1.5 flex gap-2.5 leading-relaxed text-pretty text-(--pf-muted)">
                      <FactOrigin source={item.facts[0].source} />
                      {item.facts[0].text}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-14 flex flex-wrap items-start justify-between gap-6">
          <OriginLegend portfolio={portfolio} />
          <MadeWith />
        </footer>
      </div>
    </TemplateShell>
  )
}

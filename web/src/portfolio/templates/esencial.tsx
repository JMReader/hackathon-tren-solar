import { CvLink, FactOrigin, MadeWith, OriginLegend, Portrait, factLabel } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

export function Esencial({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto grid max-w-[76rem] gap-x-16 gap-y-12 px-6 py-12 @2xl:px-10 @5xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @5xl:py-20">
        <header className="flex flex-col gap-6 @5xl:sticky @5xl:top-20 @5xl:self-start">
          <Portrait portfolio={portfolio} className="size-24 rounded-2xl" />
          <div>
            <h1 className="pf-rise font-display text-[clamp(3rem,11cqi,5.5rem)] leading-[0.95] font-light tracking-[-0.035em] text-balance">
              {portfolio.display_name}
            </h1>
            {portfolio.headline && <p className="mt-4 text-xl text-(--pf-muted)">{portfolio.headline}</p>}
          </div>
          <CvLink portfolio={portfolio} />
          <OriginLegend portfolio={portfolio} className="border-t border-(--pf-ink)/15 pt-5" />
        </header>

        <div className="flex flex-col">
          {portfolio.items.map((item) => (
            <section key={item.title} className="border-t border-(--pf-ink) pt-5 pb-12 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 @2xl:flex-nowrap">
                <h2 className="font-display text-[1.75rem] leading-[1.1] font-normal tracking-[-0.02em] text-balance">{item.title}</h2>
                {item.occurred_on && <p className="shrink-0 text-sm text-(--pf-muted) tabular-nums">{formatOccurredOn(item.occurred_on)}</p>}
              </div>
              <dl className="mt-6 flex flex-col">
                {item.facts.map((fact) => (
                  <div key={fact.text} className="grid gap-x-6 gap-y-1 border-t border-(--pf-ink)/12 py-4 first:border-t-0 first:pt-0 @md:grid-cols-[7.5rem_minmax(0,1fr)]">
                    <dt className="flex items-center gap-2 self-start text-sm leading-[1.75rem] text-(--pf-muted)">
                      <FactOrigin source={fact.source} />
                      {factLabel(fact.category) ?? "Hecho"}
                    </dt>
                    <dd className="max-w-[60ch] text-[17px] leading-[1.75rem] text-pretty">{fact.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <MadeWith className="mt-12" />
        </div>
      </div>
    </TemplateShell>
  )
}

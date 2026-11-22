import { CvLink, FactOrigin, MadeWith, OriginLegend, Portrait } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

export function Esencial({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto flex max-w-[42rem] flex-col px-6 py-14 @2xl:py-20">
        <header className="flex items-center gap-5">
          <Portrait portfolio={portfolio} className="size-16 shrink-0 rounded-full text-xl" />
          <div>
            <h1 className="font-display text-[2.5rem] leading-[1.05] font-light tracking-[-0.03em] text-balance">
              {portfolio.display_name}
            </h1>
            {portfolio.headline && <p className="mt-1 text-lg text-(--pf-muted)">{portfolio.headline}</p>}
          </div>
        </header>

        <OriginLegend portfolio={portfolio} className="mt-8" />

        <div className="mt-12 flex flex-col">
          {portfolio.items.map((item) => (
            <section key={item.title} className="border-t border-(--pf-ink)/12 py-9 first:border-t-0 first:pt-0">
              <h2 className="font-display text-2xl leading-tight font-normal tracking-[-0.02em] text-balance">{item.title}</h2>
              {item.occurred_on && <p className="mt-1 text-sm text-(--pf-muted)">{formatOccurredOn(item.occurred_on)}</p>}
              <ul className="mt-4 flex flex-col gap-3">
                {item.facts.map((fact) => (
                  <li key={fact.text} className="flex gap-3 text-[17px] leading-relaxed text-pretty">
                    <FactOrigin source={fact.source} />
                    {fact.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <CvLink portfolio={portfolio} />
          <MadeWith />
        </footer>
      </div>
    </TemplateShell>
  )
}

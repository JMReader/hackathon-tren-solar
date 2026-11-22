import { CvLink, FactOrigin, MadeWith, OriginLegend } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

export function Editorial({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto max-w-[76rem] px-6 py-10 @2xl:px-10 @5xl:py-14">
        <header className="border-y-2 border-(--pf-ink) py-6 text-center @5xl:py-9">
          <h1 className="pf-rise font-(family-name:--font-instrument) text-[clamp(3.5rem,14cqi,6rem)] leading-[0.88] tracking-[-0.02em] text-balance">
            {portfolio.display_name}
          </h1>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--pf-ink)/20 py-3 text-sm text-(--pf-muted)">
          <p>{portfolio.headline}</p>
          <p className="tabular-nums">{portfolio.items.length === 1 ? "Un logro" : `${portfolio.items.length} logros`}</p>
        </div>

        {portfolio.items.map((item) => (
          <article key={item.title} className="grid gap-x-14 gap-y-6 border-b border-(--pf-ink)/20 py-12 @4xl:grid-cols-2 @5xl:py-16">
            <div>
              <h2 className="font-(family-name:--font-instrument) text-[clamp(2.5rem,7.5cqi,4.5rem)] leading-[0.95] tracking-[-0.015em] text-balance">
                {item.title}
              </h2>
              {item.occurred_on && <p className="mt-4 text-sm text-(--pf-muted) italic">{formatOccurredOn(item.occurred_on)}</p>}
            </div>
            <div className="flex flex-col gap-5 @4xl:pt-3">
              {item.facts.map((fact, index) => (
                <p
                  key={fact.text}
                  className={
                    index === 0
                      ? "font-display text-[1.375rem] leading-[1.5] text-pretty first-letter:float-left first-letter:mr-2.5 first-letter:font-(family-name:--font-instrument) first-letter:text-[4.25rem] first-letter:leading-[0.82] first-letter:text-(--pf-accent)"
                      : "flex gap-3 text-[17px] leading-relaxed text-pretty"
                  }
                >
                  {index > 0 && <FactOrigin source={fact.source} />}
                  {fact.text}
                </p>
              ))}
            </div>
          </article>
        ))}

        <footer className="flex flex-wrap items-start justify-between gap-6 pt-8">
          <OriginLegend portfolio={portfolio} />
          <div className="flex flex-col items-end gap-4">
            <CvLink portfolio={portfolio} />
            <MadeWith />
          </div>
        </footer>
      </div>
    </TemplateShell>
  )
}

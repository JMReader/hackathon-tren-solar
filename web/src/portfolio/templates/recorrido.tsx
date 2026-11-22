import { CvLink, FactOrigin, MadeWith, OriginLegend } from "../parts"
import { monthAndYear } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

export function Recorrido({ portfolio }: TemplateProps) {
  const items = [...portfolio.items].sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto max-w-[80rem] px-6 py-10 @2xl:px-10 @5xl:py-16">
        <header className="border-b-2 border-(--pf-ink) pb-7">
          <h1 className="pf-rise font-(family-name:--font-archivo) text-[clamp(3.75rem,15cqi,8.5rem)] leading-[0.84] font-extrabold tracking-[-0.02em] text-balance uppercase [font-stretch:62%]">
            {portfolio.display_name}
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            {portfolio.headline && <p className="text-xl text-(--pf-muted)">{portfolio.headline}</p>}
            <CvLink portfolio={portfolio} />
          </div>
        </header>

        <ol>
          {items.map((item) => {
            const date = monthAndYear(item.occurred_on)
            return (
              <li key={item.title} className="grid gap-x-12 gap-y-4 border-b border-(--pf-ink)/15 py-9 @3xl:grid-cols-[minmax(11rem,3fr)_9fr] @3xl:py-12">
                <p className="flex items-baseline gap-2.5 font-(family-name:--font-archivo) [font-stretch:68%] @3xl:flex-col @3xl:gap-1">
                  <span className="text-[clamp(1.75rem,5.5cqi,3.75rem)] leading-none font-bold text-(--pf-accent)">{date?.month ?? "Sin fecha"}</span>
                  {date && <span className="text-xl leading-none font-medium text-(--pf-muted) tabular-nums @3xl:text-2xl">{date.year}</span>}
                </p>
                <div>
                  <h2 className="text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance">{item.title}</h2>
                  <ul className="mt-5 flex max-w-[62ch] flex-col gap-3.5">
                    {item.facts.map((fact) => (
                      <li key={fact.text} className="flex gap-3 text-[17px] leading-relaxed text-pretty">
                        <FactOrigin source={fact.source} />
                        {fact.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ol>

        <footer className="mt-8 flex flex-wrap items-start justify-between gap-6">
          <OriginLegend portfolio={portfolio} />
          <MadeWith />
        </footer>
      </div>
    </TemplateShell>
  )
}

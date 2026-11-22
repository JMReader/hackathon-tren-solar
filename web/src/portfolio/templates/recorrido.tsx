import { CvLink, FactOrigin, MadeWith, OriginLegend, Portrait } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

export function Recorrido({ portfolio }: TemplateProps) {
  const items = [...portfolio.items].sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto flex max-w-[46rem] flex-col px-6 py-14 @2xl:py-20">
        <header className="flex flex-col gap-5">
          <Portrait portfolio={portfolio} className="size-14 rounded-2xl text-lg" />
          <h1 className="font-(family-name:--font-archivo) text-[clamp(2.75rem,9cqi,4.5rem)] leading-[0.92] font-bold tracking-[-0.02em] [font-stretch:72%] text-balance">
            {portfolio.display_name}
          </h1>
          {portfolio.headline && <p className="text-lg text-(--pf-muted)">{portfolio.headline}</p>}
        </header>

        <ol className="mt-14 flex flex-col border-l-2 border-(--pf-accent)">
          {items.map((item) => (
            <li key={item.title} className="relative pb-12 pl-8 last:pb-0">
              <span aria-hidden className="absolute top-1.5 -left-[7px] size-3 rounded-full bg-(--pf-accent) ring-4 ring-(--pf-bg)" />
              <p className="font-(family-name:--font-archivo) text-sm font-semibold tracking-[0.01em] text-(--pf-accent) tabular-nums [font-stretch:85%]">
                {formatOccurredOn(item.occurred_on) ?? "Sin fecha"}
              </p>
              <h2 className="mt-1.5 text-[1.375rem] leading-snug font-semibold tracking-[-0.015em] text-balance">{item.title}</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {item.facts.map((fact) => (
                  <li key={fact.text} className="flex gap-2.5 leading-relaxed text-pretty">
                    <FactOrigin source={fact.source} />
                    {fact.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <footer className="mt-16 flex flex-col gap-6">
          <OriginLegend portfolio={portfolio} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CvLink portfolio={portfolio} />
            <MadeWith />
          </div>
        </footer>
      </div>
    </TemplateShell>
  )
}

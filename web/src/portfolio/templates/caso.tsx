import { CvLink, FactOrigin, MadeWith, OriginLegend, Portrait, factLabel } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const frame = "mx-auto w-full max-w-[80rem] px-6 @2xl:px-10"

export function Caso({ portfolio }: TemplateProps) {
  const [lead, ...rest] = portfolio.items
  return (
    <TemplateShell portfolio={portfolio}>
      <header className={`${frame} flex flex-wrap items-center justify-between gap-4 py-5`}>
        <div className="flex items-center gap-3.5">
          <Portrait portfolio={portfolio} className="size-11 rounded-full" />
          <p className="leading-tight">
            <span className="block font-(family-name:--font-bricolage) text-lg font-semibold tracking-[-0.01em]">{portfolio.display_name}</span>
            {portfolio.headline && <span className="block text-sm text-(--pf-muted)">{portfolio.headline}</span>}
          </p>
        </div>
        <CvLink portfolio={portfolio} />
      </header>

      {lead && (
        <>
          <section className="bg-(--pf-accent) text-(--pf-on-accent)">
            <div className={`${frame} grid gap-8 pt-16 pb-10 @5xl:grid-cols-[8fr_4fr] @5xl:items-end @5xl:pt-28 @5xl:pb-14`}>
              <h1 className="pf-rise font-display text-[clamp(2.75rem,9cqi,6rem)] leading-[0.95] font-light tracking-[-0.035em] text-balance">
                {lead.title}
              </h1>
              {lead.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lead.photo_url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
              ) : (
                lead.occurred_on && <p className="text-lg text-(--pf-on-accent)/85 tabular-nums @5xl:text-right">{formatOccurredOn(lead.occurred_on)}</p>
              )}
            </div>
          </section>

          <dl className={`${frame} grid gap-x-16 gap-y-10 py-12 @4xl:grid-cols-2 @5xl:py-16`}>
            {lead.facts.map((fact) => (
              <div key={fact.text}>
                <dt className="flex items-center gap-2 text-sm text-(--pf-muted)">
                  <FactOrigin source={fact.source} />
                  {factLabel(fact.category) ?? "Hecho"}
                </dt>
                <dd className="mt-2.5 max-w-[46ch] text-[1.375rem] leading-[1.45] text-pretty">{fact.text}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {rest.length > 0 && (
        <section className={`${frame} pb-6`}>
          <h2 className="border-b border-(--pf-ink) pb-4 font-display text-[2rem] leading-none font-light tracking-[-0.03em]">Otros logros</h2>
          <ul>
            {rest.map((item) => (
              <li key={item.title} className="grid gap-x-10 gap-y-2 border-b border-(--pf-ink)/15 py-6 @4xl:grid-cols-[4fr_6fr_auto]">
                <h3 className="text-xl leading-snug font-semibold tracking-[-0.015em] text-balance">{item.title}</h3>
                {item.facts[0] && (
                  <p className="flex gap-2.5 leading-relaxed text-pretty text-(--pf-muted)">
                    <FactOrigin source={item.facts[0].source} />
                    {item.facts[0].text}
                  </p>
                )}
                {item.occurred_on && <p className="text-sm leading-[1.75rem] text-(--pf-muted) tabular-nums @4xl:text-right">{formatOccurredOn(item.occurred_on)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className={`${frame} flex flex-wrap items-start justify-between gap-6 py-8`}>
        <OriginLegend portfolio={portfolio} />
        <MadeWith />
      </footer>
    </TemplateShell>
  )
}

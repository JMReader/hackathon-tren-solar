import type { FactCategory } from "../types"
import { CvLink, FactOrigin, MadeWith, OriginKey, Portrait } from "../parts"
import { firstName } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const priority: FactCategory[] = ["impact", "role", "project", "tech", "learning", "context", "date"]

export function Credencial({ portfolio }: TemplateProps) {
  const facts = portfolio.items
    .flatMap((item) => item.facts)
    .toSorted((a, b) => priority.indexOf(a.category ?? "context") - priority.indexOf(b.category ?? "context"))
    .slice(0, 3)
  const count = portfolio.items.length

  return (
    <TemplateShell portfolio={portfolio} className="grid content-center justify-items-center px-4 py-8 @4xl:py-14">
      <div className="grid w-full max-w-[26rem] overflow-hidden rounded-2xl bg-(--pf-surface) shadow-[0_2px_4px_rgb(0_0_0/0.06),0_30px_70px_-30px_rgb(0_0_0/0.45)] @4xl:max-w-[64rem] @4xl:grid-cols-[5fr_6fr]">
        <div className="flex min-h-[19rem] flex-col justify-between gap-10 bg-(--pf-accent) p-7 text-(--pf-on-accent) @4xl:min-h-[31rem] @4xl:p-10">
          <span aria-hidden className="mx-auto h-3 w-16 rounded-full bg-(--pf-bg) shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)]" />
          <div>
            <Portrait portfolio={portfolio} className="mb-6 size-24 rounded-xl" />
            <h1 className="pf-rise font-(family-name:--font-bricolage) text-[clamp(2.75rem,9.5cqi,4.5rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-balance">
              {portfolio.display_name}
            </h1>
            {portfolio.headline && <p className="mt-3 text-lg text-(--pf-on-accent)/85">{portfolio.headline}</p>}
          </div>
        </div>

        <div className="flex flex-col p-7 @4xl:p-10">
          <p className="text-sm text-(--pf-muted)">
            {count === 1 ? "Un logro revisado" : `${count} logros revisados`} por {firstName(portfolio.display_name)}
          </p>
          <ul className="mt-5 flex flex-col">
            {facts.map((fact) => (
              <li key={fact.text} className="flex gap-3 border-t border-(--pf-ink)/12 py-4 text-[17px] leading-snug text-pretty first:border-t-0 first:pt-0">
                <FactOrigin source={fact.source} />
                {fact.text}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-5 pt-6">
            <CvLink portfolio={portfolio} className="w-full justify-center @4xl:w-fit" />
            <OriginKey portfolio={portfolio} className="text-[13px] text-(--pf-muted)" />
          </div>
        </div>
      </div>
      <MadeWith className="mt-6" />
    </TemplateShell>
  )
}

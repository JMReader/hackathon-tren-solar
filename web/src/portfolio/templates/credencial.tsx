import type { FactCategory } from "../types"
import { CvLink, FactOrigin, MadeWith, Portrait } from "../parts"
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
    <TemplateShell portfolio={portfolio} className="grid content-center justify-items-center px-4 py-8">
      <div className="w-full max-w-[24rem] overflow-hidden rounded-[28px] bg-(--pf-surface) shadow-[0_1px_2px_rgb(0_0_0/0.08),0_24px_60px_-24px_rgb(0_0_0/0.35)]">
        <div aria-hidden className="h-24 bg-(--pf-accent)" />
        <div className="flex flex-col px-6 pb-6">
          <Portrait portfolio={portfolio} className="-mt-11 size-[5.5rem] rounded-full text-2xl ring-[5px] ring-(--pf-surface)" />
          <h1 className="mt-4 font-(family-name:--font-archivo) text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] [font-stretch:110%]">
            {portfolio.display_name}
          </h1>
          {portfolio.headline && <p className="text-(--pf-muted)">{portfolio.headline}</p>}

          <ul className="mt-6 flex flex-col gap-3 border-t border-(--pf-ink)/12 pt-5">
            {facts.map((fact) => (
              <li key={fact.text} className="flex gap-2.5 text-[15px] leading-snug text-pretty">
                <FactOrigin source={fact.source} />
                {fact.text}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-(--pf-muted)">
            {count === 1 ? "Un logro revisado" : `${count} logros revisados`} por {firstName(portfolio.display_name)}.
          </p>

          <CvLink portfolio={portfolio} className="mt-6 w-full justify-center" />
        </div>
      </div>
      <MadeWith className="mt-5" />
    </TemplateShell>
  )
}

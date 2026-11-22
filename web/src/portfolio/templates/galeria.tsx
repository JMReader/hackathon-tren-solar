import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CvLink, FactOrigin, MadeWith, OriginLegend, Portrait } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const fallbackTiles = [
  "bg-(--pf-accent) text-(--pf-on-accent)",
  "bg-(--pf-surface) text-(--pf-ink)",
  "bg-(--pf-accent)/15 text-(--pf-ink)",
]

export function Galeria({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-10 @2xl:px-8 @2xl:py-14">
        <header className="flex flex-wrap items-end justify-between gap-6 px-2">
          <div className="flex items-center gap-4">
            <Portrait portfolio={portfolio} className="size-12 shrink-0 rounded-full text-base" />
            <div>
              <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">{portfolio.display_name}</h1>
              {portfolio.headline && <p className="text-(--pf-muted)">{portfolio.headline}</p>}
            </div>
          </div>
          <CvLink portfolio={portfolio} />
        </header>

        <ul className="mt-10 grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {portfolio.items.map((item, index) => (
            <li key={item.title}>
              <details className="group overflow-hidden rounded-3xl bg-(--pf-surface) shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.18)]">
                <summary className="relative block aspect-[4/3] @2xl:aspect-[4/5] cursor-pointer list-none outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-(--pf-accent) [&::-webkit-details-marker]:hidden">
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo_url} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn("absolute inset-0 flex items-start p-6 font-display text-[7rem] leading-none font-light", fallbackTiles[index % fallbackTiles.length])}
                    >
                      {item.title[0]}
                    </span>
                  )}
                  <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 rounded-2xl bg-(--pf-bg)/94 p-4 text-(--pf-ink) backdrop-blur-sm">
                    <span>
                      <span className="block text-[17px] leading-snug font-medium text-balance">{item.title}</span>
                      {item.occurred_on && <span className="mt-0.5 block text-sm text-(--pf-muted)">{formatOccurredOn(item.occurred_on)}</span>}
                    </span>
                    <Plus aria-hidden className="size-5 shrink-0 transition-transform duration-200 ease-out group-open:rotate-45" />
                    <span className="sr-only">Ver hechos</span>
                  </span>
                </summary>
                <ul className="flex flex-col gap-3 p-5 pt-4">
                  {item.facts.map((fact) => (
                    <li key={fact.text} className="flex gap-2.5 text-[15px] leading-relaxed text-pretty">
                      <FactOrigin source={fact.source} />
                      {fact.text}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>

        <footer className="mt-10 flex flex-wrap items-start justify-between gap-6 px-2">
          <OriginLegend portfolio={portfolio} />
          <MadeWith />
        </footer>
      </div>
    </TemplateShell>
  )
}

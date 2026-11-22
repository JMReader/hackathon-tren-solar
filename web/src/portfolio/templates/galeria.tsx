import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CvLink, FactOrigin, MadeWith, OriginLegend } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const tones = [
  "bg-(--pf-accent) text-(--pf-on-accent)",
  "bg-(--pf-ink) text-(--pf-bg)",
  "bg-(--pf-surface) text-(--pf-ink) ring-1 ring-(--pf-ink)/10 ring-inset",
]
const spans = ["@3xl:col-span-4", "@3xl:col-span-2", "@3xl:col-span-2", "@3xl:col-span-4"]

export function Galeria({ portfolio }: TemplateProps) {
  const count = portfolio.items.length
  return (
    <TemplateShell portfolio={portfolio}>
      <div className="mx-auto max-w-[88rem] px-4 py-8 @2xl:px-8 @5xl:py-12">
        <header className="flex flex-wrap items-end justify-between gap-6 px-1 pb-8 @5xl:pb-10">
          <div>
            <h1 className="pf-rise font-(family-name:--font-instrument) text-[clamp(3.25rem,10cqi,6rem)] leading-[0.9] tracking-[-0.02em] text-balance">
              {portfolio.display_name}
            </h1>
            {portfolio.headline && <p className="mt-3 text-lg text-(--pf-muted)">{portfolio.headline}</p>}
          </div>
          <CvLink portfolio={portfolio} />
        </header>

        <ul className="grid gap-3 @3xl:grid-cols-6">
          {portfolio.items.map((item, index) => (
            <li key={item.title} className={cn(spans[index % spans.length], index === count - 1 && count % 2 === 1 && "@3xl:col-span-6 @3xl:[&>article]:min-h-[17rem]")}>
              <article
                className={cn(
                  "relative flex h-full min-h-[21rem] flex-col justify-between gap-10 overflow-hidden rounded-2xl p-6 @3xl:min-h-[27rem] @3xl:p-9",
                  item.photo_url ? "bg-black text-white" : tones[index % tones.length],
                )}
              >
                {item.photo_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo_url} alt="" className="absolute inset-0 size-full object-cover" />
                    <span aria-hidden className="absolute inset-0 bg-black/45" />
                  </>
                )}
                <p className="relative text-sm tabular-nums opacity-80">{formatOccurredOn(item.occurred_on)}</p>
                <div className="relative">
                  <h2 className="max-w-[18ch] font-(family-name:--font-instrument) text-[clamp(2.25rem,5.2cqi,3.75rem)] leading-[0.98] tracking-[-0.01em] text-balance">
                    {item.title}
                  </h2>
                  <details className="group mt-5">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-sm text-[15px] font-medium underline decoration-current/40 underline-offset-[5px] [&::-webkit-details-marker]:hidden">
                      <Plus aria-hidden className="size-4 transition-transform duration-200 ease-out group-open:rotate-45" />
                      <span className="group-open:hidden">Ver los hechos</span>
                      <span className="hidden group-open:inline">Ocultar los hechos</span>
                    </summary>
                    <ul className="mt-4 flex max-w-[58ch] flex-col gap-3">
                      {item.facts.map((fact) => (
                        <li key={fact.text} className="flex gap-2.5 text-[16px] leading-relaxed text-pretty">
                          <FactOrigin source={fact.source} className="text-current" />
                          {fact.text}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <footer className="mt-8 flex flex-wrap items-start justify-between gap-6 px-1">
          <OriginLegend portfolio={portfolio} />
          <MadeWith />
        </footer>
      </div>
    </TemplateShell>
  )
}

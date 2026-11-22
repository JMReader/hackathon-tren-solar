import { CvLink, MadeWith } from "../parts"
import { firstName } from "../theme"
import type { FactSource } from "../types"
import { TemplateShell, type TemplateProps } from "./shell"

const sourceNotes: Record<FactSource, string> = {
  transcript: "por audio",
  user: "al revisar",
  mcp: "del repositorio",
}

function shortHash(text: string) {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 7)
}

export function Terminal({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio} className="bg-(--pf-ink) font-(family-name:--font-jetbrains) text-(--pf-bg)">
      <div className="mx-auto max-w-[68rem] px-5 py-10 text-[15px] leading-relaxed @2xl:px-10 @5xl:py-16">
        <header>
          <p className="text-(--pf-bg)/60">
            <span className="select-none">$ </span>whoami
          </p>
          <h1 className="pf-rise mt-2 text-[clamp(2.25rem,8cqi,4.5rem)] leading-[1] font-bold tracking-[-0.04em] text-balance">
            {portfolio.display_name}
          </h1>
          {portfolio.headline && <p className="mt-3 text-lg text-(--pf-bg)/75">{portfolio.headline}</p>}
        </header>

        <p className="mt-12 text-(--pf-bg)/60">
          <span className="select-none">$ </span>git log --author=&quot;{firstName(portfolio.display_name)}&quot;
        </p>
        <ol className="mt-4 flex flex-col">
          {portfolio.items.map((item) => (
            <li key={item.title} className="border-t border-(--pf-bg)/15 py-7">
              <p className="flex flex-wrap gap-x-4 text-sm text-(--pf-bg)/60 tabular-nums">
                <span>commit {shortHash(item.title)}</span>
                {item.occurred_on && <span>{item.occurred_on}</span>}
              </p>
              <h2 className="mt-2 text-xl leading-snug font-bold tracking-[-0.02em] text-balance @3xl:text-2xl">{item.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {item.facts.map((fact) => (
                  <li key={fact.text} className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-pretty">
                    <span aria-hidden className="font-bold text-(--pf-bg) select-none">+</span>
                    <span className="max-w-[72ch]">
                      {fact.text} <span className="whitespace-nowrap text-(--pf-bg)/55"># {sourceNotes[fact.source]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-5 border-t border-(--pf-bg)/15 pt-7">
          <p className="text-sm text-(--pf-bg)/60"># {firstName(portfolio.display_name)} revisó cada dato antes de publicar</p>
          <CvLink portfolio={portfolio} className="bg-(--pf-bg) text-(--pf-ink)" />
        </footer>
        <MadeWith className="mt-6 text-(--pf-bg)/55" />
      </div>
    </TemplateShell>
  )
}

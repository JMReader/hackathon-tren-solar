import { CvLink, FactOrigin, MadeWith, OriginLegend } from "../parts"
import { formatOccurredOn } from "../theme"
import { TemplateShell, type TemplateProps } from "./shell"

const fills = ["var(--pf-accent)", "var(--pf-ink)", "var(--pf-surface)", "color-mix(in oklab, var(--pf-accent) 45%, var(--pf-bg))"]
const columns = 16
const rows = 4

function seedFrom(text: string) {
  let seed = 7
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) % 9973
  return seed
}

function Weave({ name }: { name: string }) {
  const seed = seedFrom(name)
  const cells = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const mirrored = Math.min(column, columns - 1 - column)
    const pick = (mirrored * 3 + row * 5 + seed) % fills.length
    const up = (mirrored + row + seed) % 2 === 0
    return { column, row, fill: fills[pick], ground: fills[(pick + 2) % fills.length], up }
  })
  return (
    <svg aria-hidden viewBox={`0 0 ${columns * 10} ${rows * 10}`} preserveAspectRatio="xMidYMid slice" className="h-40 w-full @3xl:h-60">
      {cells.map(({ column, row, fill, ground, up }) => {
        const x = column * 10
        const y = row * 10
        return (
          <g key={`${column}-${row}`}>
            <rect x={x} y={y} width="10.2" height="10.2" fill={ground} />
            <polygon points={up ? `${x},${y + 10} ${x + 5},${y} ${x + 10},${y + 10}` : `${x},${y} ${x + 10},${y} ${x + 5},${y + 10}`} fill={fill} />
          </g>
        )
      })}
    </svg>
  )
}

export function Telar({ portfolio }: TemplateProps) {
  return (
    <TemplateShell portfolio={portfolio}>
      <Weave name={portfolio.display_name} />
      <div className="mx-auto max-w-[76rem] px-6 pt-10 pb-10 @2xl:px-10 @5xl:pt-14">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="pf-rise font-display text-[clamp(3rem,11cqi,5.5rem)] leading-[0.95] font-light tracking-[-0.035em] text-balance">
              {portfolio.display_name}
            </h1>
            {portfolio.headline && <p className="mt-3 text-xl text-(--pf-muted)">{portfolio.headline}</p>}
          </div>
          <CvLink portfolio={portfolio} />
        </header>

        <ul className="mt-12 grid gap-x-12 @4xl:grid-cols-2">
          {portfolio.items.map((item) => (
            <li key={item.title} className="border-t-2 border-(--pf-accent) pt-5 pb-12">
              <h2 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-balance">{item.title}</h2>
              {item.occurred_on && <p className="mt-1 text-sm text-(--pf-muted) tabular-nums">{formatOccurredOn(item.occurred_on)}</p>}
              <ul className="mt-5 flex flex-col gap-3.5">
                {item.facts.map((fact) => (
                  <li key={fact.text} className="flex gap-3 text-[17px] leading-relaxed text-pretty">
                    <FactOrigin source={fact.source} />
                    {fact.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <footer className="flex flex-wrap items-start justify-between gap-6 border-t border-(--pf-ink)/15 pt-6">
          <OriginLegend portfolio={portfolio} />
          <MadeWith />
        </footer>
      </div>
    </TemplateShell>
  )
}

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { portfolioFonts } from "../fonts"
import "../portfolio.css"
import { paletteStyle } from "../theme"
import type { PublicPortfolio } from "../types"

export type TemplateProps = { portfolio: PublicPortfolio }

export function TemplateShell({ portfolio, className, children }: TemplateProps & { className?: string; children: ReactNode }) {
  return (
    <div data-portfolio style={paletteStyle(portfolio.palette)} className={cn(portfolioFonts, "@container relative flex min-h-full flex-1 flex-col bg-(--pf-bg)")}>
      <article className={cn("flex-1 font-sans text-(--pf-ink) antialiased", className)}>{children}</article>
    </div>
  )
}

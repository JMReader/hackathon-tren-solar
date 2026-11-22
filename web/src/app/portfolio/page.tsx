import type { Metadata } from "next"
import { demoPortfolio } from "@/portfolio/demo"
import { PortfolioEditor } from "@/portfolio/editor/editor"

export const metadata: Metadata = {
  title: "Tu portfolio",
}

export default function PortfolioEditorPage() {
  return <PortfolioEditor portfolio={demoPortfolio} />
}

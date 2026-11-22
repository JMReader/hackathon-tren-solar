import type { Metadata } from "next"
import { PortfolioEditorShell } from "@/portfolio/editor/editor-shell"

export const metadata: Metadata = { title: "Tu portfolio" }

export default function AppPortfolioPage() {
  return <PortfolioEditorShell embedded />
}

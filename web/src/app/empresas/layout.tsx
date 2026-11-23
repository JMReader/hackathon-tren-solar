import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Empresas" }

export default function EmpresasLayout({ children }: { children: ReactNode }) {
  return children
}

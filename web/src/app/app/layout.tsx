import type { Metadata } from "next"
import { AppShell } from "@/components/app/shell"

export const metadata: Metadata = {
  title: { default: "Tu espacio · Tren Solar", template: "%s · Tren Solar" },
}

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>
}

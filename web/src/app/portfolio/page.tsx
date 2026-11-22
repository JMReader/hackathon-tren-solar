import { redirect } from "next/navigation"

// The editor lives inside the user space now.
export default function PortfolioEditorPage() {
  redirect("/app/portfolio")
}

import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/login/login-form"

export const metadata: Metadata = { title: "Ingresar" }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-5 py-12">
      <Link href="/" className="font-display text-3xl tracking-display text-ink">
        chambeAR
      </Link>
      <LoginForm />
      <p className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-ink-muted">
        <Link href="/" className="hover:text-ink hover:underline">
          Volver al inicio
        </Link>
        <span aria-hidden>·</span>
        <Link href="/onboarding" className="hover:text-ink hover:underline">
          Probar sin cuenta
        </Link>
      </p>
    </main>
  )
}

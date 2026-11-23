import Link from "next/link"
import { buttonStyles } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 bg-cream px-6 text-center">
      <p className="font-display text-2xl tracking-display text-ink">chambeAR</p>
      <h1 className="font-display text-[36px] leading-tight tracking-display text-ink">No encontramos esta página</h1>
      <p className="max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonStyles({ variant: "outline" })}>
          Ir al inicio
        </Link>
        <Link href="/app" className={buttonStyles()}>
          Ir a mi espacio
        </Link>
      </div>
    </main>
  )
}

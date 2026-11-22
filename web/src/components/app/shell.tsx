"use client"

import { House, LayoutTemplate, Mic, UserRound, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense, type ReactNode } from "react"
import { useProfile, useSessionId } from "@/lib/api/hooks"
import { getPhotoPreview } from "@/lib/photo-preview"
import { useIsClient } from "@/lib/use-is-client"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; short: string; icon: LucideIcon; match: (path: string) => boolean }

const NAV: NavItem[] = [
  { href: "/app", label: "Inicio", short: "Inicio", icon: House, match: (p) => p === "/app" },
  { href: "/app/crear", label: "Crear post", short: "Crear", icon: Mic, match: (p) => p.startsWith("/app/crear") },
  { href: "/portfolio", label: "Portfolio", short: "Portfolio", icon: LayoutTemplate, match: (p) => p.startsWith("/portfolio") },
  { href: "/onboarding", label: "Mi perfil", short: "Perfil", icon: UserRound, match: (p) => p.startsWith("/onboarding") },
]

function UserChip() {
  const { data: sessionId } = useSessionId()
  const { data: profile } = useProfile(sessionId)
  const isClient = useIsClient()
  const photo = isClient ? getPhotoPreview(profile?.photo_id) : null
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate text-on-dark">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <UserRound aria-hidden className="size-5" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-inverse">{profile?.profession ?? "Tu perfil"}</span>
        <span className="block text-xs text-on-dark-muted">Sesión anónima · 24 h</span>
      </span>
    </div>
  )
}

// usePathname needs a Suspense boundary on dynamic routes (cacheComponents).
function WithPath({ render }: { render: (pathname: string) => ReactNode }) {
  return render(usePathname())
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring pressable flex h-11 items-center gap-3 rounded-full px-4 text-sm",
              active ? "bg-slate text-inverse" : "text-on-dark hover:bg-white/6 hover:text-inverse",
            )}
          >
            <item.icon aria-hidden className={cn("size-[18px]", active && item.href === "/app/crear" && "text-accent")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/8 bg-night/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
    >
      {NAV.map((item) => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px]",
              active ? "text-inverse" : "text-on-dark-muted",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-12 items-center justify-center rounded-full",
                active && (item.href === "/app/crear" ? "bg-accent-strong text-white" : "bg-slate"),
              )}
            >
              <item.icon aria-hidden className="size-[18px]" />
            </span>
            {item.short}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-night lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:px-6 lg:py-10">
        <div className="flex flex-col gap-10">
          <Link href="/" className="focus-ring rounded-md px-2 font-display text-[28px] tracking-display text-inverse">
            Tren Solar
          </Link>
          <Suspense fallback={<SideNav pathname="" />}>
            <WithPath render={(p) => <SideNav pathname={p} />} />
          </Suspense>
        </div>
        <div className="flex flex-col gap-5 px-2">
          <UserChip />
          <p className="text-[13px] text-on-dark-muted">Nada se publica sin tu OK.</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:min-h-dvh lg:bg-cream lg:pb-0">
        <header className="flex items-center justify-between px-4 pt-7 pb-4 lg:hidden">
          <Link href="/" className="font-display text-2xl tracking-display text-inverse">
            Tren Solar
          </Link>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>

      <Suspense fallback={<BottomNav pathname="" />}>
        <WithPath render={(p) => <BottomNav pathname={p} />} />
      </Suspense>
    </div>
  )
}

/** Page frame inside the shell: paper card on mobile, open cream panel on desktop. */
export function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-1 flex-col px-4 lg:px-14 lg:pt-12 xl:px-20">
      <div
        className={cn(
          "mx-auto flex w-full max-w-xl flex-1 flex-col rounded-[22px] bg-paper p-5 shadow-raised sm:p-6 lg:max-w-[1120px] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function PageTitle({ title, lead, eyebrow }: { title: string; lead?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div>
      {eyebrow}
      <h1 tabIndex={-1} className="font-display text-[28px] leading-tight tracking-display text-ink outline-none lg:text-[40px]">
        {title}
      </h1>
      {lead && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">{lead}</p>}
    </div>
  )
}

const STEPS = ["Contalo", "Revisá", "Copiá"]

export function CreateSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Pasos" className="mb-5 flex items-center gap-2 text-xs lg:mb-7">
      {STEPS.map((label, i) => {
        const n = i + 1
        const state = n < current ? "done" : n === current ? "current" : "upcoming"
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="h-px w-4 bg-hairline sm:w-8" />}
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-medium",
                state === "current" && "bg-accent-soft text-accent-deep",
                state === "done" && "bg-fill-soft text-ink",
                state === "upcoming" && "text-ink-faint",
              )}
            >
              <span className="tabular-nums">{n}</span>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

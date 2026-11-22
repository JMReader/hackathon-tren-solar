import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "./content";
import { LogoMark } from "./kit";

/* Static product mockups built in HTML. Data shown is illustrative. */

const NAV = ["Inicio", "Logros", "Portfolio", "Ofertas"];

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    Inicio: <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    Logros: <path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zM5 11a7 7 0 0 0 14 0M12 18v3" />,
    Portfolio: <path d="M4 7h16v12H4zM9 7V5h6v2" />,
    Ofertas: <path d="M4 12h16M12 4l8 8-8 8" />,
    Ajustes: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2" />,
    search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    mic: <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export function Pill({ tone = "muted", children }: { tone?: "ok" | "info" | "muted" | "accent"; children: ReactNode }) {
  const tones = {
    ok: "bg-lp-ok/10 text-lp-ok ring-lp-ok/25",
    info: "bg-lp-info/10 text-lp-info ring-lp-info/25",
    muted: "bg-white/5 text-white/60 ring-white/10",
    accent: "bg-lp-accent-soft text-lp-accent ring-lp-accent/25",
  };
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center rounded-md px-1.5 whitespace-nowrap text-[10px] font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}

export function Waveform({ bars = 38, className }: { bars?: number; className?: string }) {
  return (
    <div className={cn("flex h-10 items-center gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="w-[3px] origin-center animate-lp-wave rounded-full bg-lp-accent"
          style={{
            height: `${30 + ((i * 47) % 70)}%`,
            animationDelay: `${(i % 9) * -0.13}s`,
            opacity: 0.45 + ((i * 13) % 55) / 100,
          }}
        />
      ))}
    </div>
  );
}

export function QuoteChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md bg-white/[0.04] px-2 py-1 font-lp-mono text-[10px] text-white/55 ring-1 ring-inset ring-white/[0.06]">
      <span className="text-lp-accent">“</span>
      {children}
    </span>
  );
}

function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0c0d] text-[12px] text-white/80 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
      <aside className="hidden w-[170px] shrink-0 flex-col border-r border-white/[0.06] p-3 sm:flex">
        <div className="mb-5 flex items-center gap-2 px-2 pt-1 text-[11px] font-medium tracking-[0.12em] text-white uppercase">
          <LogoMark className="size-3.5" />
          {BRAND.name}
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <span
              key={n}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5",
                n === active ? "bg-white/[0.07] text-white" : "text-white/55",
              )}
            >
              <Icon name={n} />
              {n}
            </span>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-md px-2 py-2">
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#e3a873] to-[#b9553c] text-[10px] font-semibold text-white">
            LQ
          </span>
          <span className="leading-tight">
            <span className="block text-[11px] text-white">Lucía Quispe</span>
            <span className="block text-[10px] text-white/45">Desarrolladora web</span>
          </span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <span className="flex h-7 flex-1 items-center gap-2 rounded-md bg-white/[0.04] px-2.5 text-[11px] text-white/35 ring-1 ring-inset ring-white/[0.06]">
            <Icon name="search" className="size-3.5" />
            Buscar logros, posts, ofertas…
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-5">{children}</div>
      </div>
    </div>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <p className="text-[18px] font-medium tracking-[-0.02em] text-white">{title}</p>
      <p className="text-[12px] text-white/45">{sub}</p>
    </div>
  );
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-white/[0.07] bg-white/[0.025] p-3", className)}>{children}</div>
  );
}

export function RecordScreen() {
  return (
    <AppShell active="Inicio">
      <Title title="Buen día, Lucía." sub="Contá qué hiciste esta semana." />
      <Panel className="mb-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-white">
            <span className="relative grid size-8 place-items-center rounded-full bg-lp-accent text-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-lp-accent/40" />
              <Icon name="mic" className="relative" />
            </span>
            Grabando
          </span>
          <span className="font-lp-mono text-[13px] text-white">00:42</span>
        </div>
        <Waveform />
        <p className="mt-3 text-[11px] leading-relaxed text-white/50">
          “…esta semana armé la tienda online de la cooperativa de tejedoras de Tilcara, con catálogo y pedidos por
          WhatsApp…”
        </p>
      </Panel>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Logros", "7", "+2"],
          ["Posts", "12", "+4"],
          ["Ofertas", "5", "+1"],
        ].map(([k, v, d]) => (
          <Panel key={k}>
            <p className="text-[10px] text-white/45">{k}</p>
            <p className="mt-1 flex items-baseline gap-1.5 text-[18px] text-white">
              {v} <span className="text-[10px] text-lp-ok">↑ {d}</span>
            </p>
          </Panel>
        ))}
      </div>
      <p className="mt-4 mb-2 text-[11px] text-white/45">Últimos logros</p>
      <div className="flex flex-col gap-1.5">
        {[
          ["Landing para la feria de Purmamarca", "Aprobado", "ok"],
          ["Curso de React terminado", "En revisión", "info"],
          ["Bot de turnos para el centro de salud", "Borrador", "muted"],
        ].map(([t, s, tone]) => (
          <div key={t} className="flex items-center justify-between rounded-md px-1 py-1">
            <span className="truncate">{t}</span>
            <Pill tone={tone as "ok" | "info" | "muted"}>{s}</Pill>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export function ReviewScreen() {
  const facts = [
    ["Armó la tienda online de una cooperativa de tejedoras.", "armé la tienda online de la cooperativa"],
    ["Integró pedidos por WhatsApp.", "pedidos por WhatsApp"],
    ["Cargó un catálogo con fotos de cada pieza.", "un catálogo con las fotos de cada"],
  ];
  return (
    <AppShell active="Logros">
      <div className="mb-4 flex items-start justify-between">
        <Title title="Revisá tu logro" sub="Tienda online · cooperativa de Tilcara" />
        <Pill tone="info">Revisión 2</Pill>
      </div>
      <div className="flex flex-col gap-2">
        {facts.map(([f, q]) => (
          <Panel key={f} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-4 place-items-center rounded bg-lp-ok/15 text-lp-ok">
              <Icon name="check" className="size-3" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1.5 block text-white">{f}</span>
              <QuoteChip>{q}</QuoteChip>
            </span>
          </Panel>
        ))}
        <Panel className="border-lp-accent/25 bg-lp-accent-soft">
          <p className="mb-2 text-[11px] text-lp-accent">Pregunta abierta</p>
          <p className="mb-2 text-white">¿Cuántas personas usan la tienda hoy?</p>
          <span className="block h-7 rounded-md bg-black/30 px-2 text-[11px] leading-7 text-white/35 ring-1 ring-inset ring-white/10">
            Escribí tu respuesta…
          </span>
        </Panel>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <span className="rounded-full px-3 py-1.5 text-white/60 ring-1 ring-white/10">Editar</span>
        <span className="rounded-full bg-white px-3 py-1.5 font-medium text-black">Aprobar</span>
      </div>
    </AppShell>
  );
}

export function PublishScreen() {
  return (
    <AppShell active="Logros">
      <Title title="Publicá" sub="Dos borradores, uno por red." />
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-white">
              <span className="grid size-5 place-items-center rounded bg-[#0a66c2] text-[10px] font-bold text-white">in</span>
              LinkedIn
            </span>
            <Pill tone="ok">Conectado</Pill>
          </div>
          <p className="flex-1 text-[11px] leading-relaxed text-white/70">
            Esta semana terminé la tienda online de la cooperativa de tejedoras de Tilcara. Ahora tienen catálogo con
            fotos de cada pieza y reciben pedidos por WhatsApp, sin intermediarios. 🧶
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-lp-mono text-[10px] text-white/40">214 / 3000</span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-black">Publicar</span>
          </div>
        </Panel>
        <Panel className="flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-white">
              <span className="grid size-5 place-items-center rounded bg-white text-[11px] font-bold text-black">𝕏</span>
              X
            </span>
            <Pill tone="muted">Asistido</Pill>
          </div>
          <p className="flex-1 text-[11px] leading-relaxed text-white/70">
            Terminé la tienda online de la cooperativa de tejedoras de Tilcara: catálogo con fotos y pedidos por
            WhatsApp. Talento del norte, desde el norte.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-lp-mono text-[10px] text-white/40">158 / 280</span>
            <span className="rounded-full px-3 py-1 text-[11px] text-white/70 ring-1 ring-white/15">Copiar texto</span>
          </div>
        </Panel>
      </div>
      <Panel className="mt-3 flex items-center gap-3">
        <span className="size-10 shrink-0 rounded-md bg-gradient-to-br from-[#c76f4b] via-[#e3a873] to-[#6f8a6a]" />
        <span className="min-w-0 flex-1">
          <span className="block text-white">Foto del proyecto</span>
          <span className="block text-[10px] text-white/45">Se adjunta en LinkedIn · En X se agrega a mano</span>
        </span>
        <Pill tone="accent">Nada se publica sin tu OK</Pill>
      </Panel>
    </AppShell>
  );
}

export function ConnectScreen() {
  return (
    <AppShell active="Portfolio">
      <div className="grid h-full gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Panel className="overflow-hidden p-0">
          <div className="h-16 bg-gradient-to-r from-[#4f7fa6] via-[#d7c0ad] to-[#f3b088]" />
          <div className="p-4">
            <span className="-mt-10 mb-2 grid size-12 place-items-center rounded-full border-2 border-[#0b0c0d] bg-gradient-to-br from-[#e3a873] to-[#b9553c] text-sm font-semibold text-white">
              LQ
            </span>
            <p className="text-[15px] font-medium text-white">Lucía Quispe</p>
            <p className="mb-3 text-[11px] text-white/45">Desarrolladora web · Tilcara, Jujuy</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {["React", "WhatsApp API", "Diseño UX", "Next.js"].map((s) => (
                <Pill key={s}>{s}</Pill>
              ))}
            </div>
            {["Tienda online de la cooperativa", "Landing para la feria de Purmamarca"].map((t) => (
              <div key={t} className="flex items-center justify-between border-t border-white/[0.06] py-2">
                <span className="truncate">{t}</span>
                <Pill tone="ok">Con evidencia</Pill>
              </div>
            ))}
          </div>
        </Panel>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-white/45">Ofertas sugeridas</p>
          {[
            ["Desarrollo web junior", "Remoto · Argentina", "3 habilidades en común"],
            ["Diseño de e-commerce", "Remoto · por proyecto", "2 habilidades en común"],
            ["Soporte técnico digital", "Híbrido · Jujuy", "2 habilidades en común"],
          ].map(([t, m, s]) => (
            <Panel key={t}>
              <p className="text-white">{t}</p>
              <p className="mb-2 text-[10px] text-white/45">{m}</p>
              <Pill tone="accent">{s}</Pill>
            </Panel>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export const STEP_SCREENS = [RecordScreen, ReviewScreen, PublishScreen, ConnectScreen];

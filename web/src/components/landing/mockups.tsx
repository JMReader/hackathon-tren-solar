import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Small static UI fragments used by the feature cards. Data shown is illustrative. */

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

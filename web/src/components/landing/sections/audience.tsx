"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AUDIENCES } from "../content";
import { Container, Heading, Reveal, Tag } from "../kit";
import { Scene } from "../scene";

type Key = keyof typeof AUDIENCES;
const TABS: { key: Key; label: string }[] = [
  { key: "jovenes", label: "Jóvenes" },
  { key: "instituciones", label: "Instituciones" },
];

export function Audience() {
  const [tab, setTab] = useState<Key>("jovenes");

  return (
    <section id="para-quien" className="scroll-mt-12 py-28">
      <Container>
        <Reveal className="text-center">
          <Heading
            lead="Hecho para quien"
            fade="construye."
            className="text-[clamp(1.75rem,3.4vw,2rem)] leading-[1.2]"
          />
          <p className="mt-2 text-sm tracking-[-0.02em] text-lp-body">
            Si aprendiste algo o hiciste algo, ya tenés qué contar.
          </p>
        </Reveal>

        <div className="mt-8 flex justify-center">
          <div role="tablist" className="inline-flex rounded-full border border-lp-line bg-white/[0.03] p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-7 rounded-full px-3 text-sm font-medium tracking-[-0.02em] transition-colors duration-300",
                  tab === t.key ? "bg-white text-lp-bg" : "text-lp-body hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {AUDIENCES[tab].map((a, i) => (
            <Reveal
              key={`${tab}-${a.tag}`}
              delay={i * 90}
              className={cn(
                "flex flex-col rounded-2xl border bg-[#111] p-4",
                "featured" in a && a.featured ? "border-white/15" : "border-lp-line",
              )}
            >
              <Tag className="self-start">{a.tag}</Tag>
              <p className="mt-5 text-[22px] leading-[1.15] font-medium tracking-[-0.02em] text-white">{a.title}</p>
              <p className="mt-2 text-sm leading-[1.2] tracking-[-0.02em] text-lp-body">{a.body}</p>
              <div className="relative mt-5 min-h-[180px] flex-1 overflow-hidden rounded-xl">
                <Scene variant={a.variant} fade={false} className="absolute inset-0 scale-125" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
                <ul className="relative flex flex-col gap-2 p-3">
                  {a.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-sm font-medium text-white">
                      <svg viewBox="0 0 24 24" className="size-3.5 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="m5 12 4.5 4.5L19 7" />
                      </svg>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-lp-body">
          {tab === "jovenes"
            ? "Sin mudanzas · Sin vueltas · Con tu voz."
            : "La propuesta para instituciones está en exploración."}
        </p>
      </Container>
    </section>
  );
}

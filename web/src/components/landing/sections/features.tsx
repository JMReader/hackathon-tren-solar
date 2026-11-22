"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FEATURES } from "../content";
import { Container, Heading, Reveal } from "../kit";
import { Pill, QuoteChip, Waveform } from "../mockups";

const PREVIEWS: Record<(typeof FEATURES)[number]["key"], ReactNode> = {
  audio: (
    <div className="flex h-full flex-col justify-center gap-3">
      <span className="font-lp-mono text-xs text-white/70">00:42</span>
      <Waveform bars={30} />
      <p className="text-[11px] leading-relaxed text-white/55">“…armé la tienda online de la cooperativa…”</p>
    </div>
  ),
  facts: (
    <div className="flex h-full flex-col justify-center gap-2">
      {["Armó la tienda online.", "Integró pedidos por WhatsApp."].map((f, i) => (
        <div key={f} className="rounded-lg border border-white/10 bg-black/30 p-2.5 text-[11px] text-white">
          <p className="mb-1.5">{f}</p>
          <QuoteChip>{i ? "pedidos por WhatsApp" : "armé la tienda online"}</QuoteChip>
        </div>
      ))}
    </div>
  ),
  voice: (
    <div className="flex h-full flex-col justify-center gap-2 text-[11px]">
      {[
        ["Profesión", "Desarrolladora web"],
        ["Tono", "Cercano, sin vueltas"],
        ["Emojis", "Pocos"],
      ].map(([k, v]) => (
        <div key={k} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <span className="text-white/50">{k}</span>
          <span className="text-white">{v}</span>
        </div>
      ))}
    </div>
  ),
  social: (
    <div className="flex h-full flex-col justify-center gap-2 text-[11px]">
      {[
        ["in", "LinkedIn", "214 / 3000", "#0a66c2"],
        ["𝕏", "X", "158 / 280", "#000"],
      ].map(([i, n, c, bg]) => (
        <div key={n} className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2.5">
          <span className="grid size-5 place-items-center rounded text-[10px] font-bold text-white" style={{ background: bg }}>
            {i}
          </span>
          <span className="flex-1 text-white">{n}</span>
          <span className="font-lp-mono text-[10px] text-white/50">{c}</span>
        </div>
      ))}
    </div>
  ),
  portfolio: (
    <div className="flex h-full flex-col justify-center">
      <div className="rounded-lg bg-black/30 p-3">
        <span className="mb-2 block size-8 rounded-full bg-gradient-to-br from-[#e3a873] to-[#b9553c]" />
        <p className="text-xs text-white">Lucía Quispe</p>
        <p className="mb-2 text-[10px] text-white/50">Tilcara, Jujuy</p>
        <div className="flex flex-wrap gap-1">
          <Pill>React</Pill>
          <Pill>Next.js</Pill>
          <Pill tone="ok">2 logros</Pill>
        </div>
      </div>
    </div>
  ),
  session: (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span className="font-lp-mono text-3xl text-white">23:59:12</span>
      <span className="text-[11px] text-white/55">Sesión anónima · sin contraseña</span>
    </div>
  ),
};

export function Features() {
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = 2;

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPage(max > 0 && el.scrollLeft > max / 2 ? 1 : 0);
  };

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * (el.scrollWidth - el.clientWidth), behavior: "smooth" });
  };

  return (
    <section className="py-28">
      <Container>
        <Reveal>
          <Heading
            lead={<>Todo lo que necesitás.<br /></>}
            fade="Nada que te frene."
            className="text-center text-[clamp(1.75rem,3.4vw,2rem)] leading-[1.2]"
          />
        </Reveal>
      </Container>
      <Container className="mt-14">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="lp-no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 [mask-image:linear-gradient(90deg,#000_85%,transparent)]"
        >
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.key}
              delay={i * 80}
              className="group relative flex h-[420px] w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl p-3"
              style={{ background: `linear-gradient(180deg, ${f.tint} 0%, color-mix(in srgb, ${f.tint} 70%, #070707) 100%)` }}
            >
              <div className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0b0c0d]/85 p-4 transition-transform duration-700 ease-lp group-hover:-translate-y-1">
                {PREVIEWS[f.key]}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0c0d] to-transparent" />
              </div>
              <div className="px-2 pt-4 pb-2">
                <p className="text-base font-medium tracking-[-0.02em] text-white">{f.title}</p>
                <p className="mt-1.5 text-sm leading-[1.2] tracking-[-0.02em] text-white/80">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a la página ${i + 1}`}
              className={cn("size-1.5 rounded-full transition-colors", i === page ? "bg-white" : "bg-white/25")}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

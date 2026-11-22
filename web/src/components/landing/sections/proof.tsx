"use client";

import { useEffect, useRef, useState } from "react";
import { STATS } from "../content";
import { Container, Reveal, Tag } from "../kit";
import { Scene } from "../scene";

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min((t - start) / 1200, 1);
        setN(Math.round(value * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

export function Proof() {
  return (
    <section className="relative py-20">
      <Container className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-[15%] -top-6 h-[220px] overflow-hidden opacity-50 blur-2xl [mask-image:radial-gradient(closest-side,#000,transparent)]">
          <Scene fade={false} />
        </div>
        <div className="relative grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="text-center">
              <p className="font-lp-mono text-[clamp(2.5rem,5vw,3rem)] leading-none text-white">
                <CountUp value={s.value} suffix={s.suffix} />
              </p>
              <h3 className="mt-2 text-sm text-lp-muted">{s.label}</h3>
            </Reveal>
          ))}
        </div>

        <Reveal className="relative mx-auto mt-14 grid max-w-[700px] overflow-hidden rounded-2xl border border-lp-line bg-[#111] md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col p-6">
            <Tag className="self-start">Ejemplo ilustrativo</Tag>
            <h3 className="mt-6 text-xl leading-[1.2] font-medium tracking-[-0.01em] text-white">
              “Esta semana armé la tienda online de la cooperativa de tejedoras de mi pueblo.”
            </h3>
            <p className="mt-3 text-sm leading-[1.2] tracking-[-0.02em] text-lp-body">
              Un audio así se convierte en hechos con su cita, un post para LinkedIn y otro para X, y un logro nuevo en
              el portfolio.
            </p>
            <div className="mt-auto pt-10">
              <p className="text-base font-medium tracking-[-0.02em] text-white">Lucía, 21</p>
              <p className="text-sm text-lp-muted">Persona de ejemplo · Tilcara</p>
            </div>
          </div>
          <div className="relative m-1.5 min-h-[300px] overflow-hidden rounded-xl">
            <Scene variant="day" fade={false} className="absolute inset-0" />
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 place-items-center bg-black/10 p-4 text-center text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]">
              {[
                ["1", "audio"],
                ["3", "hechos con cita"],
                ["2", "borradores"],
                ["1", "logro en el portfolio"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="text-[32px] leading-none font-medium tracking-[-0.02em]">{n}</p>
                  <p className="mt-1 text-sm leading-tight">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

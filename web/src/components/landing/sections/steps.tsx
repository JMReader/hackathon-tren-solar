"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { STEPS } from "../content";
import { Container, Heading, Reveal, Tag } from "../kit";
import { APP_SCREENS, AppFrame } from "../app-screens";
import { Scene } from "../scene";

function StepText({ step, className }: { step: (typeof STEPS)[number]; className?: string }) {
  return (
    <div className={className}>
      <Tag>
        {step.n}&nbsp;&nbsp;{step.label}
      </Tag>
      <h3 className="mt-8 text-xl leading-[1.2] font-medium tracking-[-0.01em] text-white">{step.title}</h3>
      <p className="mt-3 text-sm leading-[1.25] tracking-[-0.02em] text-lp-body">{step.body}</p>
    </div>
  );
}

export function Steps() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const progress = Math.min(Math.max(-r.top / Math.max(total, 1), 0), 0.999);
      setActive(Math.floor(progress * STEPS.length));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="producto" className="relative scroll-mt-12">
      <Container className="relative pt-10">
        <div aria-hidden className="pointer-events-none absolute -inset-x-24 -top-16 h-[380px] overflow-hidden opacity-40 blur-2xl [mask-image:radial-gradient(closest-side,#000,transparent)]">
          <Scene variant="dusk" fade={false} />
        </div>
        <Reveal className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <Heading
            as="h2"
            lead={<>Contalo una vez.<br /></>}
            fade="Que llegue lejos."
            className="text-[clamp(2rem,4.2vw,2.625rem)] leading-none"
          />
          <p className="max-w-[300px] text-sm leading-[1.2] tracking-[-0.02em] text-lp-body">
            Un audio alcanza. Vos revisás cada dato antes de que salga a cualquier lado.
          </p>
        </Reveal>
      </Container>

      {/* Desktop: sticky scroll-driven steps */}
      <div ref={trackRef} className="relative hidden h-[300vh] lg:block">
        <div className="sticky top-20 flex h-[calc(100vh-5rem)] items-start pt-4">
          <Container className="grid max-w-[1200px] grid-cols-[300px_1fr] grid-rows-[auto_auto] gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-lp-line bg-gradient-to-b from-white/[0.05] to-transparent p-5">
              {STEPS.map((s, i) => (
                <StepText
                  key={s.n}
                  step={s}
                  className={cn(
                    "absolute inset-5 transition-all duration-700 ease-lp",
                    i === active ? "translate-y-0 opacity-100 blur-0" : "pointer-events-none translate-y-3 opacity-0 blur-sm",
                  )}
                />
              ))}
              <div className="absolute inset-x-5 bottom-5 flex gap-1.5">
                {STEPS.map((s, i) => (
                  <span key={s.n} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className={cn("block h-full bg-lp-accent transition-transform duration-700 ease-lp origin-left", i <= active ? "scale-x-100" : "scale-x-0")}
                    />
                  </span>
                ))}
              </div>
            </div>
            <div className="grid">
              {APP_SCREENS.map((screen, i) => (
                <div
                  key={screen.path}
                  aria-hidden={i !== active}
                  className={cn(
                    "[grid-area:1/1] transition-all duration-700 ease-lp",
                    i === active ? "scale-100 opacity-100" : "pointer-events-none scale-[0.98] opacity-0",
                  )}
                >
                  <AppFrame screen={screen} priority={i === 0} />
                </div>
              ))}
            </div>
            <p className="col-span-2 text-center text-xs text-lp-muted">Capturas reales de la app, con datos de ejemplo.</p>
          </Container>
        </div>
      </div>

      {/* Mobile / tablet: stacked */}
      <Container className="mt-8 flex flex-col gap-10 pb-10 lg:hidden">
        {STEPS.map((s, i) => {
          const screen = APP_SCREENS[i];
          return (
            <Reveal key={s.n} className="flex flex-col gap-3">
              <StepText step={s} className="rounded-2xl border border-lp-line bg-white/[0.03] p-5" />
              <AppFrame screen={screen} />
            </Reveal>
          );
        })}
        <p className="text-center text-xs text-lp-muted">Capturas reales de la app, con datos de ejemplo.</p>
      </Container>
    </section>
  );
}

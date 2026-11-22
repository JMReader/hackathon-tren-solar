import { FAQ, START_HREF } from "../content";
import { Button, Container, Heading, Reveal } from "../kit";

export function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-12 py-24">
      <Container className="grid gap-10 md:grid-cols-[1fr_1.35fr]">
        <Reveal>
          <Heading lead="Preguntas," fade="respondidas." className="text-[clamp(1.75rem,3.4vw,2rem)] leading-[1.2]" />
          <p className="mt-2 text-sm tracking-[-0.02em] text-lp-body">
            Lo que necesitás saber antes de grabar tu primer audio.
          </p>
          <p className="mt-14 text-sm tracking-[-0.02em] text-lp-body">¿Te quedó alguna duda?</p>
          <Button href={START_HREF} variant="solid" size="sm" className="mt-3">
            Probalo ahora
          </Button>
        </Reveal>
        <div className="flex flex-col gap-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="lp-faq group rounded-xl border border-lp-line bg-white/[0.025] transition-colors open:bg-white/[0.04]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium tracking-[-0.02em] text-white">
                  {f.q}
                  <span className="lp-faq-icon text-lg leading-none text-white/50 transition-transform duration-300">+</span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-[1.35] tracking-[-0.02em] text-lp-body">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

import { PLACES, START_HREF } from "../content";
import { Button, Eyebrow, Reveal } from "../kit";
import { Llamas } from "../llamas";
import { Scene } from "../scene";

export function Hero() {
  return (
    <section id="inicio" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Scene />
        <Llamas layout="hero" className="absolute inset-0" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 pt-24 pb-10 text-center">
        <Reveal>
          <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] leading-none font-medium tracking-[-0.02em] text-white [text-shadow:0_2px_30px_rgb(0_0_0/0.25)]">
            Que tu talento se mueva.
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-4 max-w-[340px] text-sm leading-[1.2] tracking-[-0.02em] text-white/90">
            Contá en un audio lo que aprendiste o construiste. Armamos tu portfolio y tus posts, y te acercamos
            oportunidades sin que tengas que irte.
          </p>
        </Reveal>
        <Reveal delay={240} className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button href={START_HREF} variant="glass">
            Grabar mi primer logro
          </Button>
          <Button href="#producto" variant="solid">
            Ver cómo funciona
          </Button>
        </Reveal>
      </div>

      <div className="relative pb-16 text-center">
        <Eyebrow className="mb-5">Pensado para jóvenes de toda la provincia.</Eyebrow>
        <div className="mx-auto max-w-[460px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]">
          <div className="flex w-max animate-lp-marquee gap-8">
            {[...PLACES, ...PLACES].map((p, i) => (
              <span
                key={i}
                className="text-2xl font-semibold tracking-[-0.04em] whitespace-nowrap text-white/45"
                aria-hidden={i >= PLACES.length}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

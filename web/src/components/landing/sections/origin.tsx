import { BRAND, ORIGIN } from "../content";
import { LogoMark, Reveal } from "../kit";
import { Llamas } from "../llamas";
import { Scene } from "../scene";

export function Origin() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Scene variant="dusk" />
        <Llamas layout="origin" className="absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-lp-bg to-transparent" />
      </div>
      <div className="mx-auto flex min-h-[900px] max-w-[1010px] flex-col items-center px-5 pt-36 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-[420px] text-[clamp(1.75rem,3.4vw,2rem)] leading-[1.2] font-medium tracking-[-0.02em] text-white">
            Las oportunidades, en tu lugar de origen.
          </h2>
          <p className="mx-auto mt-2 max-w-[360px] text-sm leading-[1.2] tracking-[-0.02em] text-white/90">
            No te pedimos que te vayas a la ciudad. Hacemos que lo que construís desde acá se vea desde cualquier lado.
          </p>
        </Reveal>
        <Reveal delay={120} className="my-12">
          <LogoMark className="size-28 text-white drop-shadow-[0_10px_40px_rgb(0_0_0/0.25)] [mask-image:linear-gradient(#000_55%,transparent)]" />
          <span className="sr-only">{BRAND.name}</span>
        </Reveal>
        <div className="grid w-full max-w-[740px] gap-8 text-left sm:grid-cols-3">
          {ORIGIN.map((o, i) => (
            <Reveal key={o.title} delay={200 + i * 100}>
              <p className="flex items-center gap-2 text-base font-medium tracking-[-0.02em] text-white">
                <span className="size-1.5 rounded-full bg-lp-accent" />
                {o.title}
              </p>
              <p className="mt-2 text-sm leading-[1.2] tracking-[-0.02em] text-white/90">{o.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

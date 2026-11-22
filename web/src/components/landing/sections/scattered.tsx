import { SCATTERED } from "../content";
import { Reveal } from "../kit";

export function Scattered() {
  return (
    <section className="relative px-5 py-32 md:py-52">
      <div className="relative mx-auto max-w-[1010px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
          {SCATTERED.map((s) => (
            <span
              key={s.text}
              className="absolute animate-lp-float rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm whitespace-nowrap text-white/50 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-sm"
              style={{
                left: s.x,
                top: s.y,
                rotate: `${s.r}deg`,
                animationDelay: `${-s.d}s`,
                filter: s.d > 1.5 ? "blur(1.5px)" : undefined,
              }}
            >
              {s.text}
            </span>
          ))}
        </div>
        <Reveal>
          <p className="relative mx-auto max-w-[620px] text-center text-[clamp(2.5rem,6vw,4rem)] leading-none font-semibold tracking-[-0.02em] text-balance text-white">
            Tu talento no debería tener que <span className="lp-fade">mudarse.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

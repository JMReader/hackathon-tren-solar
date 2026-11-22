import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppFrame, EMPLOYER_SCREEN } from "../app-screens";
import { Button, Card, Container, Heading, Reveal, Tag } from "../kit";

const EMPLOYER_STEPS = [
  {
    title: "Buscá por habilidad y lugar",
    body: "Escribís el rol o la habilidad y dónde, por ejemplo Diseño UX en Jujuy.",
  },
  {
    title: "Mirá cuánto talento hay",
    body: "Con Free sabés cuántos perfiles coinciden con tu búsqueda.",
  },
  {
    title: "Con Pro, abrí los portfolios",
    body: "Cargás tu propuesta y revisás hasta cinco perfiles: por qué coincide cada uno, su LinkedIn y su portfolio.",
  },
];

const PLANS = [
  { name: "Free", body: "Cuántos perfiles coinciden con tu búsqueda." },
  { name: "Pro", body: "Tu propuesta, hasta cinco portfolios y la evidencia de cada coincidencia." },
];

export function Employers() {
  return (
    <section id="empresas" className="scroll-mt-20 py-28">
      <Container className="max-w-[1200px]">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Tag>Para empresas</Tag>
            <Heading
              lead={
                <>
                  Talento que se ve,
                  <br />
                </>
              }
              fade="con evidencia."
              className="mt-5 text-[clamp(2rem,4.2vw,2.625rem)] leading-none"
            />
          </div>
          <p className="max-w-[340px] text-sm leading-[1.25] tracking-[-0.02em] text-lp-body">
            Las empresas encuentran perfiles por lo que la persona hizo y aprobó, no por un CV. Sin pedirle a nadie que
            se mude.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start lg:gap-12">
          <div className="flex flex-col">
            <ol className="flex flex-col border-t border-lp-line">
              {EMPLOYER_STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 90} className="flex gap-4 border-b border-lp-line py-5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lp-accent-soft font-lp-mono text-xs text-lp-accent">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-medium tracking-[-0.02em] text-white">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-[1.3] tracking-[-0.02em] text-lp-body">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={300} className="mt-6 grid grid-cols-2 gap-3">
              {PLANS.map((p) => (
                <Card key={p.name} className="p-4">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="mt-1.5 text-[13px] leading-[1.3] tracking-[-0.02em] text-lp-body">{p.body}</p>
                </Card>
              ))}
            </Reveal>
            <Reveal delay={360} className="mt-6 flex flex-wrap items-center gap-3">
              <Button href="/empresas" variant="light">
                Probar la demo para empresas
              </Button>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <AppFrame screen={EMPLOYER_SCREEN} />
            <p className="mt-3 text-center text-xs text-lp-muted">Captura real de la demo, con empresas y perfiles de ejemplo.</p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

const CONSENT_OPTIONS = [
  { label: "Compartir portfolio", on: true },
  { label: "Compartir LinkedIn", on: true },
  { label: "Compartir X", on: false },
  { label: "Compartir cantidad de publicaciones de los últimos 7 días", on: false },
];

const CONSENT_POINTS = [
  {
    title: "Es opcional y va aparte",
    body: "Publicar tu portfolio no te hace visible para empresas. Lo activás vos, por separado.",
  },
  {
    title: "Sólo lo que aprobaste",
    body: "Las búsquedas usan las habilidades y los logros que revisaste. Nunca tu audio ni lo que no aprobaste.",
  },
  {
    title: "Lo revocás cuando quieras",
    body: "Un botón y dejás de aparecer en las búsquedas siguientes.",
  },
];

function Box({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[5px] ring-1 ring-inset",
        on ? "bg-white text-lp-bg ring-white" : "ring-white/25",
      )}
    >
      {on && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

export function Consent() {
  return (
    <section className="py-20">
      <Container>
        <div className="grid items-center gap-12 md:grid-cols-[1fr_minmax(0,420px)]">
          <Reveal>
            <Heading
              lead={
                <>
                  Vos decidís
                  <br />
                </>
              }
              fade="si te encuentran."
              className="text-[clamp(1.75rem,3.4vw,2.25rem)] leading-[1.1]"
            />
            <ul className="mt-8 flex flex-col gap-6">
              {CONSENT_POINTS.map((p) => (
                <li key={p.title}>
                  <p className="flex items-center gap-2 text-base font-medium tracking-[-0.02em] text-white">
                    <span className="size-1.5 rounded-full bg-lp-accent" />
                    {p.title}
                  </p>
                  <p className="mt-1.5 max-w-[420px] pl-3.5 text-sm leading-[1.3] tracking-[-0.02em] text-lp-body">{p.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150}>
            <Card className="p-6 shadow-lp-card">
              <p className="text-lg font-medium tracking-[-0.02em] text-white">
                Visibilidad para empresas <span className="text-sm font-normal text-lp-muted">(opcional)</span>
              </p>
              <p className="mt-1.5 text-sm text-lp-body">Vos elegís qué compartir. Podés cambiarlo o revocarlo cuando quieras.</p>
              <div className="mt-5 flex items-start gap-3 text-sm text-white">
                <Box on />
                Compartir mi nombre, rol, habilidades y logros aprobados con empresas
              </div>
              <ul className="mt-3 flex flex-col gap-2.5 pl-7 text-sm text-lp-body">
                {CONSENT_OPTIONS.map((o) => (
                  <li key={o.label} className="flex items-start gap-3">
                    <Box on={o.on} />
                    {o.label}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
                <span className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-sm font-medium text-lp-bg">
                  Guardar preferencias
                </span>
                <span className="inline-flex h-8 items-center rounded-full px-3.5 text-sm text-white ring-1 ring-inset ring-white/20">
                  Revocar consentimiento
                </span>
              </div>
            </Card>
            <p className="mt-3 text-center text-xs text-lp-muted">Así aparece en el paso final de tu perfil.</p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

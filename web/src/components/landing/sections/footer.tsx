import Link from "next/link";
import { BRAND, START_HREF } from "../content";
import { Button, Container, Heading, Logo, Reveal } from "../kit";

const COLUMNS = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", href: "#producto" },
      { label: "Para quién", href: "#para-quien" },
    ],
  },
  {
    title: "Empezar",
    links: [
      { label: "Grabar un logro", href: START_HREF },
      { label: "Preguntas", href: "#preguntas" },
    ],
  },
];

export function FinalCta() {
  return (
    <section className="relative py-28 text-center">
      <div aria-hidden className="mx-auto mb-8 h-6 w-16 rounded-t-md bg-gradient-to-b from-white/25 to-transparent" />
      <Reveal>
        <Heading lead="Tu próximo paso," fade="desde acá." className="text-[clamp(1.75rem,3.4vw,2rem)] leading-[1.2]" />
        <p className="mx-auto mt-2 max-w-[320px] text-sm leading-[1.2] tracking-[-0.02em] text-lp-body">
          Grabá tu primer logro. Del portfolio, los posts y las oportunidades nos ocupamos con vos.
        </p>
        <Button href={START_HREF} variant="glass" className="mt-6">
          Grabar mi primer logro
        </Button>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-lp-line pt-14 pb-8">
      <Container className="max-w-[1240px]">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div>
            <Logo />
            <p className="mt-3 max-w-[260px] text-sm leading-[1.2] tracking-[-0.02em] text-lp-body">{BRAND.tagline}</p>
          </div>
          <div className="flex gap-16">
            {COLUMNS.map((c) => (
              <div key={c.title} className="text-sm tracking-[-0.02em]">
                <p className="mb-3 font-medium text-white">{c.title}</p>
                <ul className="flex flex-col gap-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-lp-body transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col justify-between gap-2 text-sm tracking-[-0.02em] sm:flex-row">
          <p className="text-lp-body">Hecho en Jujuy, para quienes construyen desde su lugar.</p>
          <p className="text-lp-muted">
            © 2026 {BRAND.name} · Prototipo de hackathon
          </p>
        </div>
      </Container>
    </footer>
  );
}

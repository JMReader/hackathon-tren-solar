"use client";
import { Card } from "@/components/ui/card";
import { RadioGroup, Radio } from "@/components/ui/radio";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Label } from "@/components/ui/label";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
type Candidate = {
  candidate_id: string;
  display_name?: string | null;
  role?: string | null;
  evidence: { skill: string; state: string; citation?: string | null }[];
  portfolio_slug?: string | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  publications_last_7_days?: number | null;
};
type Matches = {
  eligible_count: number;
  employer_plan: "free" | "paid";
  matches: Candidate[] | null;
};
type Search = { id: string };
const proposalDefault =
  "Buscamos una persona que diseñe en Figma el flujo de reserva de turnos de una clínica y prepare un prototipo para probarlo con pacientes.";
function normalizeSkill(value: string) {
  return /^(diseño ux|ux design)$/i.test(value.trim()) ? "UX" : value.trim();
}
export default function EmpresasPage() {
  const [plan, setPlan] = useState<"free" | "paid">("free"),
    [skill, setSkill] = useState("Diseño UX"),
    [location, setLocation] = useState("Jujuy, Argentina"),
    [proposal, setProposal] = useState(proposalDefault),
    [skills, setSkills] = useState(["Diseño UX", "Figma", "Prototipado"]),
    [extra, setExtra] = useState(""),
    [matches, setMatches] = useState<Matches | null>(null),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function search() {
    setBusy(true);
    setMatches(null);
    setError("");
    try {
      const headers = {
        "X-Employer-Id": plan === "free" ? "seed_emp_free" : "seed_emp_paid",
      };
      const created = await apiFetch<Search>("/employer/searches", {
        method: "POST",
        headers,
        json: {
          title: skill,
          required_skills:
            plan === "free"
              ? [normalizeSkill(skill)]
              : skills.map(normalizeSkill),
          location,
          province: location.split(",")[0].trim(),
          country: location.split(",")[1]?.trim() || "Argentina",
          job_proposal: plan === "paid" ? proposal : null,
        },
      });
      setMatches(
        await apiFetch<Matches>(`/employer/searches/${created.id}/matches`, {
          headers,
        }),
      );
      setSelected(0);
    } catch {
      setError(
        "No pudimos completar la búsqueda. Revisá la conexión e intentá de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  const candidates = matches?.matches ?? [],
    candidate = candidates[selected];
  return (
    <main className="min-h-screen bg-cream text-ink md:grid md:grid-cols-[300px_1fr]">
      <aside className="bg-night p-6 text-white md:min-h-screen md:p-10">
        <Link href="/" className="font-display text-3xl">
          Tren Solar
        </Link>
        <p className="mt-2 text-sm text-white/70">
          Empresas · Datos de ejemplo
        </p>
        <ol className="mt-10 space-y-5 text-sm">
          <li className="text-orange-400">1　Búsqueda</li>
          <li className={plan === "paid" ? "text-orange-400" : "text-white/55"}>
            2　Propuesta
          </li>
          <li
            className={matches?.matches ? "text-orange-400" : "text-white/55"}
          >
            3　Selección
          </li>
        </ol>
        <p id="demo-plan" className="mt-10 mb-2 text-sm text-on-dark">
          Empresa de demostración
        </p>
        <SegmentedControl
          aria-labelledby="demo-plan"
          value={plan}
          onValueChange={(value) => {
            if (value !== "free" && value !== "paid") return;
            setPlan(value);
            setMatches(null);
            setError("");
            if (value === "paid") setSkills([normalizeSkill(skill)]);
          }}
        >
          <SegmentedControlItem disabled={busy} value="free">
            Free
          </SegmentedControlItem>
          <SegmentedControlItem disabled={busy} value="paid">
            Pro
          </SegmentedControlItem>
        </SegmentedControl>
      </aside>
      <section className="mx-auto w-full max-w-5xl px-6 py-10 md:px-16 md:py-14">
        <p className="text-sm text-ink-muted">
          Búsqueda · {plan === "free" ? "Free" : "Pro"}
        </p>
        <h1 className="mt-2 font-display text-4xl">
          {plan === "paid" ? "Cargá tu propuesta" : "Buscar talento"}
        </h1>
        <p className="mt-2 text-ink-muted">
          Conocé cuántos perfiles coinciden con tu búsqueda.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Label className="text-sm">
            Rol o habilidad
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="mt-2"
            />
          </Label>
          <Label className="text-sm">
            Ubicación
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2"
            />
          </Label>
          <Button
            onClick={search}
            disabled={
              busy ||
              skill.trim().length < 2 ||
              !location.trim() ||
              (plan === "paid" && (!proposal.trim() || skills.length === 0))
            }
            className="self-end"
          >
            {busy
              ? "Buscando…"
              : plan === "paid"
                ? "Buscar candidatos"
                : "Buscar"}
          </Button>
        </div>
        {plan === "paid" && (
          <div className="mt-6">
            <Label htmlFor="proposal" className="text-sm font-medium">
              Propuesta laboral
            </Label>
            <Textarea
              id="proposal"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={4}
              className="mt-2"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Habilidades:</span>
              {skills.map((s) => (
                <Button
                  variant="secondary"
                  size="sm"
                  key={s}
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  aria-label={`Quitar ${s}`}
                >
                  {s} ×
                </Button>
              ))}
              <Label className="sr-only" htmlFor="new-skill">
                Agregar habilidad
              </Label>
              <Input
                id="new-skill"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && extra.trim()) {
                    e.preventDefault();
                    setSkills([...skills, extra.trim()]);
                    setExtra("");
                  }
                }}
                placeholder="Agregar"
                className="w-32"
              />
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-5 text-danger">
            {error}
          </p>
        )}
        {matches && (
          <div className="mt-10 border-t border-divider pt-8">
            <p className="font-display text-6xl">{matches.eligible_count}</p>
            <p className="mt-1 text-xl">perfiles coinciden</p>
            <p className="text-sm text-ink-muted">
              {skill} · {location}
            </p>
            {plan === "free" ? (
              <Card className="mt-8 items-start gap-3 p-5">
                Con Empresas Pro podés revisar hasta cinco portfolios.{" "}
                <Button
                  onClick={() => {
                    setPlan("paid");
                    setSkills([normalizeSkill(skill)]);
                    setMatches(null);
                  }}
                >
                  Probar empresa Pro
                </Button>
              </Card>
            ) : (
              candidates.length > 0 && (
                <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr]">
                  <RadioGroup
                    aria-label="Candidatos"
                    value={candidate?.candidate_id}
                    onValueChange={(id) =>
                      setSelected(
                        candidates.findIndex((c) => c.candidate_id === id),
                      )
                    }
                  >
                    {candidates.map((c) => (
                      <Label
                        key={c.candidate_id}
                        className="flex items-center gap-3 rounded-xl p-3 has-[[data-checked]]:bg-sunken"
                      >
                        <Radio value={c.candidate_id} />
                        {c.display_name || "Perfil compartido"}
                      </Label>
                    ))}
                  </RadioGroup>
                  {candidate && (
                    <Card className="p-6">
                      <h2 className="font-display text-3xl">
                        {candidate.display_name || "Perfil compartido"}
                      </h2>
                      <p className="mt-1 text-ink-muted">{candidate.role}</p>
                      <Separator className="my-5" />
                      <h3 className="font-medium">Por qué coincide</h3>
                      {candidate.evidence
                        .filter((e) => e.state === "supported")
                        .map((e, i) => (
                          <p key={i} className="mt-2">
                            <strong>{e.skill}:</strong>{" "}
                            {e.citation ||
                              "Habilidad incluida en la evidencia aprobada."}
                          </p>
                        ))}
                      <div className="mt-5 flex gap-4 text-sm">
                        {candidate.linkedin_url && (
                          <a
                            className="underline"
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            LinkedIn
                          </a>
                        )}
                        {candidate.x_url && (
                          <a
                            className="underline"
                            href={candidate.x_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            X
                          </a>
                        )}
                      </div>
                      {candidate.publications_last_7_days != null && (
                        <p className="mt-4 text-sm text-ink-muted">
                          {candidate.publications_last_7_days} publicaciones en
                          los últimos 7 días
                        </p>
                      )}
                      {candidate.portfolio_slug && (
                        <a
                          className={buttonStyles({ className: "mt-6" })}
                          href={`/p/${candidate.portfolio_slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir portfolio
                        </a>
                      )}
                    </Card>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}

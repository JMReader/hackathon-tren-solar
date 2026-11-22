"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
type Candidate = {
  candidate_id?: string;
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
        <label htmlFor="plan" className="mt-10 block text-xs text-white/60">
          Plan de demostración
        </label>
        <select
          disabled={busy}
          id="plan"
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value as "free" | "paid");
            setMatches(null);
          }}
          className="mt-2 w-full rounded-xl bg-white/10 p-3 text-white"
        >
          <option className="text-ink" value="free">
            Free · conteo
          </option>
          <option className="text-ink" value="paid">
            Pro · candidatos
          </option>
        </select>
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
          <label className="text-sm">
            Rol o habilidad
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-[#e4d9d6] bg-white p-3"
            />
          </label>
          <label className="text-sm">
            Ubicación
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-[#e4d9d6] bg-white p-3"
            />
          </label>
          <Button
            onClick={search}
            disabled={
              busy ||
              skill.trim().length < 2 ||
              !location.trim() ||
              (plan === "paid" && (!proposal.trim() || skills.length === 0))
            }
            className="self-end rounded-full bg-[#cc4600] px-6 py-3 font-medium text-white disabled:opacity-60"
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
            <label htmlFor="proposal" className="text-sm font-medium">
              Propuesta laboral
            </label>
            <Textarea
              id="proposal"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[#e4d9d6] bg-white p-4"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Habilidades:</span>
              {skills.map((s) => (
                <button
                  key={s}
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  className="rounded-full bg-white px-3 py-1 text-sm"
                >
                  {s} ×
                </button>
              ))}
              <label className="sr-only" htmlFor="new-skill">
                Agregar habilidad
              </label>
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
                className="w-28 rounded-full border bg-white px-3 py-1 text-sm"
              />
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-5 text-red-700">
            {error}
          </p>
        )}
        {matches && (
          <div className="mt-10 border-t border-[#ded4d1] pt-8">
            <p className="font-display text-6xl">{matches.eligible_count}</p>
            <p className="mt-1 text-xl">perfiles coinciden</p>
            <p className="text-sm text-ink-muted">
              {skill} · {location}
            </p>
            {plan === "free" ? (
              <p className="mt-8 rounded-xl bg-white p-5">
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
              </p>
            ) : (
              candidates.length > 0 && (
                <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr]">
                  <div role="list" aria-label="Candidatos">
                    {candidates.slice(0, 5).map((c, i) => (
                      <button
                        key={c.candidate_id ?? i}
                        onClick={() => setSelected(i)}
                        className={`block w-full rounded-lg p-3 text-left ${selected === i ? "bg-[#eadfdb]" : "hover:bg-white/70"}`}
                      >
                        {c.display_name || "Perfil compartido"}
                      </button>
                    ))}
                  </div>
                  {candidate && (
                    <article className="rounded-2xl bg-white p-6">
                      <h2 className="font-display text-3xl">
                        {candidate.display_name || "Perfil compartido"}
                      </h2>
                      <p className="mt-1 text-ink-muted">{candidate.role}</p>
                      <hr className="my-5" />
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
                          className="mt-6 inline-block rounded-full bg-[#cc4600] px-5 py-3 text-white"
                          href={`/p/${candidate.portfolio_slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir portfolio
                        </a>
                      )}
                    </article>
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

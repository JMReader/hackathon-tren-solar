"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
type Consent = {
  active: boolean;
  share_portfolio?: boolean;
  share_linkedin?: boolean;
  share_x?: boolean;
  publications_last_7_days?: number | null;
  linkedin_url?: string | null;
  x_url?: string | null;
};

export function DiscoveryConsent() {
  const [available, setAvailable] = useState(true);
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState(false);
  const [portfolio, setPortfolio] = useState(true);
  const [linkedin, setLinkedin] = useState(false);
  const [x, setX] = useState(false);
  const [activity, setActivity] = useState(false);
  const [count, setCount] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    apiFetch<Consent>("/discovery/consent")
      .then((c) => {
        if (!alive) return;
        setSaved(c.active);
        setCount(String(c.publications_last_7_days ?? ""));
        setActive(c.active);
        setPortfolio(c.share_portfolio ?? false);
        setLinkedin(c.share_linkedin ?? false);
        setX(c.share_x ?? false);
        setActivity(c.publications_last_7_days != null);
        setLinkedinUrl(c.linkedin_url ?? "");
        setXUrl(c.x_url ?? "");
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (!available) return null;
  async function save() {
    if (!active) return revoke();
    setBusy(true);
    setMessage("");
    try {
      await apiFetch<Consent>("/discovery/consent", {
        method: "POST",
        json: {
          active: true,
          shared_fields: [
            "display_name",
            "role",
            "skills",
            "evidence",
            ...(portfolio ? ["portfolio"] : []),
            ...(activity ? ["publications_7d"] : []),
          ],
          share_portfolio: portfolio,
          share_linkedin: linkedin,
          share_x: x,
          publications_last_7_days:
            activity && count !== "" ? Number(count) : null,
          linkedin_url: linkedin ? linkedinUrl || null : null,
          x_url: x ? xUrl || null : null,
        },
      });
      setSaved(true);
      setActive(true);
      setMessage("Preferencias guardadas.");
    } catch {
      setMessage(
        "No pudimos guardar estos ajustes. El onboarding sigue disponible; podés reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch<void>("/discovery/consent", { method: "DELETE" });
      setActive(false);
      setSaved(false);
      setMessage("Visibilidad revocada.");
    } catch {
      setMessage("No pudimos revocar ahora. Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="discovery-title"
      className="mt-8 rounded-2xl border border-hairline bg-paper p-5"
    >
      <h2 id="discovery-title" className="font-display text-xl text-ink">
        Visibilidad para empresas{" "}
        <span className="text-sm font-sans text-ink-muted">(opcional)</span>
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Vos elegís qué compartir. Podés cambiarlo o revocarlo cuando quieras.
      </p>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span>
          Compartir mi nombre, rol, habilidades y logros aprobados con empresas
        </span>
      </label>
      <div className="mt-3 grid gap-3 pl-7 text-sm">
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={portfolio}
            onChange={(e) => setPortfolio(e.target.checked)}
          />
          Compartir portfolio
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={linkedin}
            onChange={(e) => setLinkedin(e.target.checked)}
          />
          Compartir LinkedIn
        </label>
        {linkedin && (
          <label className="text-xs">
            Enlace de LinkedIn
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              type="url"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              placeholder="https://www.linkedin.com/in/…"
            />
          </label>
        )}
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={x}
            onChange={(e) => setX(e.target.checked)}
          />
          Compartir X
        </label>
        {x && (
          <label className="text-xs">
            Enlace de X
            <input
              value={xUrl}
              onChange={(e) => setXUrl(e.target.value)}
              type="url"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              placeholder="https://x.com/…"
            />
          </label>
        )}
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={activity}
            onChange={(e) => setActivity(e.target.checked)}
          />
          Compartir cantidad de publicaciones de los últimos 7 días
        </label>
        {activity && (
          <label>
            Publicaciones declaradas{" "}
            <input
              type="number"
              min="0"
              step="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            busy ||
            (!active && !saved) ||
            (active && activity && !/^\d+$/.test(count))
          }
          onClick={() => void save()}
          className="rounded-full bg-accent-strong px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar preferencias"}
        </button>
        {saved && active && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void revoke()}
            className="rounded-full border border-hairline px-4 py-2 text-sm"
          >
            Revocar consentimiento
          </button>
        )}
      </div>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-sm text-ink-muted"
        >
          {message}
        </p>
      )}
    </section>
  );
}

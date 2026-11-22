"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { apiFetch } from "@/lib/api/client"
import { Camera, Check, ChevronLeft, FileCheck, FileText, ImagePlus } from "lucide-react"
import type { AuthorProfile, Platform, StyleSyncResult } from "@/lib/api/types"
import {
  useCompleteOnboarding,
  useConnectSocial,
  useProfile,
  useSessionId,
  useSocialConnection,
  useSyncStyle,
  useUpdateProfile,
  useUploadCv,
  useUploadPhoto,
} from "@/lib/api/hooks"
import {
  fileToPreviewDataUrl,
  getPhotoPreview,
  savePhotoPreview,
} from "@/lib/photo-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  FileInput,
  FileInputDropzone,
  FileInputTrigger,
  formatFileSize,
} from "@/components/ui/file-input"
import { Input } from "@/components/ui/input"
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { VoiceSample } from "./voice-sample"

const PLATFORM_NAMES: Record<Platform, string> = { linkedin: "LinkedIn", x: "X" }
const MIN_SAMPLE = 20
const MAX_FILE = 10 * 1024 * 1024

const STEPS = [
  {
    id: 1,
    title: "Sobre vos",
    short: "Tu rol y tu foto",
    lead: "Con tu rol y tu foto, cada borrador arranca con tu cara y tu contexto.",
  },
  {
    id: 2,
    title: "Tu voz",
    short: "Cómo hablás y tu CV",
    lead: "Contanos algo en voz alta y aprendemos tu tono. También podés escribirlo o sumar tus posts. No publicamos nada.",
  },
  {
    id: 3,
    title: "Revisión",
    short: "Revisá y confirmá",
    lead: "Esto es lo que vamos a usar para escribir como vos.",
  },
]
const LAST_STEP = STEPS.length

function countSamplePosts(profile: AuthorProfile, platform?: Platform) {
  const posts = profile.voice_context?.sample_posts
  if (platform) return posts?.[platform]?.length ?? 0
  return (posts?.linkedin?.length ?? 0) + (posts?.x?.length ?? 0)
}

function voiceSources(profile: AuthorProfile) {
  const sources: string[] = []
  for (const platform of ["linkedin", "x"] as const) {
    const n = countSamplePosts(profile, platform)
    if (n > 0)
      sources.push(`${n} post${n === 1 ? "" : "s"} de ${PLATFORM_NAMES[platform]}`)
  }
  if ((profile.writing_sample?.trim().length ?? 0) >= MIN_SAMPLE)
    sources.push("lo que nos contaste")
  return sources
}

function listToText(items: string[]) {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function initialStep() {
  if (typeof window === "undefined") return 1
  const raw = Number(new URLSearchParams(window.location.search).get("step"))
  return raw >= 1 ? Math.min(raw, LAST_STEP) : 1
}

export function Onboarding() {
  const session = useSessionId()
  const sessionId = session.data
  const profile = useProfile(sessionId)

  if (session.isError || profile.isError)
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>No pudimos cargar tu perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-sm leading-relaxed text-ink-muted">
              Revisá tu conexión. Lo que ya cargaste sigue guardado.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                void session.refetch()
                void profile.refetch()
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </main>
    )

  if (session.isPending || !profile.data) return <WizardSkeleton />

  return <Wizard sessionId={sessionId!} profile={profile.data} />
}

function Shell({
  rail,
  mobileHeader,
  children,
}: {
  rail: ReactNode
  mobileHeader: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:min-h-dvh lg:grid-cols-[340px_1fr]">
      <aside className="hidden bg-night px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex flex-col gap-12">
          <header className="flex flex-col gap-2">
            <p className="font-display text-3xl tracking-display text-inverse">Tren Solar</p>
            <p className="max-w-[28ch] text-sm leading-relaxed text-on-dark">
              Contanos quién sos y cómo hablás. Nosotros armamos tus posts.
            </p>
          </header>
          {rail}
        </div>
        <p className="text-[13px] text-on-dark-muted">Nada se publica sin tu OK.</p>
      </aside>
      <div className="flex flex-1 flex-col lg:min-h-dvh lg:bg-cream">
        <div className="flex flex-col gap-3 px-4 pt-8 lg:hidden">
          <p className="font-display text-2xl tracking-display text-inverse">Tren Solar</p>
          {mobileHeader}
        </div>
        <div className="flex flex-1 flex-col px-4 pt-5 lg:px-14 lg:pt-14 xl:px-20">
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:max-w-[1120px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepDot({ state, n }: { state: "current" | "done" | "upcoming"; n: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs",
        state === "current" && "bg-accent-strong font-semibold text-white",
        state === "done" && "bg-accent-soft text-accent-deep",
        state === "upcoming" && "text-on-dark-muted ring-1 ring-on-dark-muted/50 ring-inset",
      )}
    >
      {state === "done" ? <Check className="size-3.5" /> : n}
    </span>
  )
}

function WizardSkeleton() {
  return (
    <Shell
      rail={
        <ol aria-hidden className="flex flex-col gap-1">
          {STEPS.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-2 py-2 opacity-60">
              <StepDot state="upcoming" n={s.id} />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-on-dark">{s.title}</span>
                <span className="text-xs text-on-dark-muted">{s.short}</span>
              </span>
            </li>
          ))}
        </ol>
      }
      mobileHeader={
        <>
          <p className="text-[13px] text-on-dark">Preparando tu perfil…</p>
          <div className="h-1.5 rounded-full bg-slate" />
        </>
      }
    >
      <div
        role="status"
        aria-label="Cargando tu perfil"
        className="rounded-[22px] bg-paper p-5 shadow-raised sm:p-6 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
      >
        <Skeleton className="h-8 w-40 lg:h-10 lg:w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:flex-row lg:gap-12">
          <div className="flex items-center gap-5 lg:flex-col lg:items-start">
            <Skeleton className="size-24 rounded-full lg:size-36" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-2 lg:max-w-lg">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-11 w-full rounded-[14px]" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Wizard({
  sessionId,
  profile,
}: {
  sessionId: string
  profile: AuthorProfile
}) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [visited, setVisited] = useState<Set<number>>(() => {
    const s = new Set<number>()
    for (let i = 1; i <= step; i++) s.add(i)
    return s
  })

  const [profession, setProfession] = useState(profile.profession ?? "")
  const [sample, setSample] = useState(profile.writing_sample ?? "")
  const [photoUploading, setPhotoUploading] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  const update = useUpdateProfile(sessionId)
  const complete = useCompleteOnboarding(sessionId)
  const isDone = profile.onboarding_status === "complete"
  const posts = countSamplePosts(profile)
  const professionOk = profession.trim().length >= 2
  const sampleOk = sample.trim().length >= MIN_SAMPLE
  const step1Done = professionOk && Boolean(profile.photo_id) && !photoUploading
  const step2Done = posts > 0 || sampleOk

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0 })
  }, [step, isDone])

  function canGoTo(n: number) {
    if (isDone) return false
    if (!(visited.has(n) || n === step + 1)) return false
    if (n > step && n >= 2 && !step1Done) return false
    if (n > step && n >= 3 && !step2Done) return false
    return true
  }

  function goTo(n: number) {
    if (!canGoTo(n)) return
    setVisited((v) => new Set(v).add(n))
    setStep(n)
    router.replace(`/onboarding?step=${n}`, { scroll: false })
  }

  async function saveSample(value = sample) {
    if (value === (profile.writing_sample ?? "")) return
    if (value.trim().length < MIN_SAMPLE && posts === 0) return
    await update.mutateAsync({ writing_sample: value }).catch(() => undefined)
  }

  async function next() {
    try {
      if (step === 1) {
        const value = profession.trim()
        if (value !== (profile.profession ?? ""))
          await update.mutateAsync({ profession: value })
        goTo(2)
      } else if (step === 2) {
        if (sample !== (profile.writing_sample ?? ""))
          await update.mutateAsync({ writing_sample: sample })
        goTo(3)
      } else {
        await complete.mutateAsync()
      }
    } catch {
      // el toast del hook ya avisa; no avanzamos si el guardado falló
    }
  }

  const missing: string[] = []
  if (step === 1) {
    if (!professionOk) missing.push("tu profesión")
    if (photoUploading) missing.push("que termine de subir la foto")
    else if (!profile.photo_id) missing.push("tu foto")
  }
  if (step === 2 && !step2Done)
    missing.push(`contarnos algo (al menos ${MIN_SAMPLE} caracteres) o conectar una red`)
  if (step === 3 && !profile.ready_for_achievement)
    missing.push("completar los pasos anteriores")

  const canContinue =
    (step === 1 && step1Done) ||
    (step === 2 && step2Done) ||
    (step === 3 && profile.ready_for_achievement)

  const current = STEPS[step - 1]

  return (
    <Shell
      rail={
        <Stepper step={step} visited={visited} isDone={isDone} canGoTo={canGoTo} goTo={goTo} />
      }
      mobileHeader={
        <>
          <p className="text-[13px] text-on-dark">
            {isDone ? "Perfil completo" : `Paso ${step} de ${LAST_STEP} · ${current.title}`}
          </p>
          <Progress
            value={isDone ? 100 : (step / LAST_STEP) * 100}
            aria-label={`Paso ${step} de ${LAST_STEP}`}
          >
            <ProgressTrack className="h-1.5 bg-slate">
              <ProgressIndicator className="bg-accent" />
            </ProgressTrack>
          </Progress>
        </>
      }
    >
      <div
        key={isDone ? "done" : step}
        className="animate-step-in rounded-[22px] bg-paper p-5 shadow-raised motion-reduce:animate-none sm:p-6 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
      >
        {isDone ? (
          <DonePanel profile={profile} headingRef={headingRef} />
        ) : (
          <>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-[28px] leading-tight tracking-display text-ink outline-none lg:text-[40px]"
            >
              {current.title}
            </h1>
            <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">
              {current.lead}
            </p>
            <div className="mt-7 lg:mt-10">
              {step === 1 && (
                <StepIdentity
                  sessionId={sessionId}
                  profile={profile}
                  profession={profession}
                  setProfession={setProfession}
                  onUploadingChange={setPhotoUploading}
                />
              )}
              {step === 2 && (
                <StepVoice
                  sessionId={sessionId}
                  profile={profile}
                  sample={sample}
                  setSample={setSample}
                  onSaveSample={saveSample}
                />
              )}
              {step === 3 && <><ProfileRows profile={profile} goToStep={goTo} /><DiscoveryConsent /></>}
            </div>
          </>
        )}
      </div>

      {!isDone && (
        <div
          data-onboarding-actions
          className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 bg-night/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm lg:static lg:mx-0 lg:mt-auto lg:border-t lg:border-hairline lg:bg-transparent lg:px-0 lg:py-6 lg:backdrop-blur-none"
        >
          {missing.length > 0 && (
            <p aria-live="polite" className="text-right text-xs text-on-dark lg:text-ink-muted">
              Falta {listToText(missing)}.
            </p>
          )}
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                className="text-inverse hover:bg-slate lg:text-ink lg:hover:bg-fill-soft"
                onClick={() => goTo(step - 1)}
              >
                <ChevronLeft aria-hidden />
                Atrás
              </Button>
            )}
            <Button className="ml-auto" disabled={!canContinue} onClick={() => next()}>
              {step === LAST_STEP ? "Terminar" : "Continuar"}
            </Button>
          </div>
        </div>
      )}
    </Shell>
  )
}

type Consent = { active: boolean; share_portfolio?: boolean; share_linkedin?: boolean; share_x?: boolean; publications_last_7_days?: number | null; linkedin_url?: string | null; x_url?: string | null }

function DiscoveryConsent() {
  const [available, setAvailable] = useState(true)
  const [saved, setSaved] = useState(false)
  const [active, setActive] = useState(false)
  const [portfolio, setPortfolio] = useState(true)
  const [linkedin, setLinkedin] = useState(false)
  const [x, setX] = useState(false)
  const [activity, setActivity] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [xUrl, setXUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  useEffect(() => {
    let alive = true
    apiFetch<Consent>("/discovery/consent").then(c => { if (!alive) return; setSaved(true); setActive(c.active); setPortfolio(c.share_portfolio ?? false); setLinkedin(c.share_linkedin ?? false); setX(c.share_x ?? false); setActivity(c.publications_last_7_days != null); setLinkedinUrl(c.linkedin_url ?? ""); setXUrl(c.x_url ?? "") }).catch(() => { if (alive) setAvailable(false) })
    return () => { alive = false }
  }, [])
  if (!available) return null
  async function save() {
    setBusy(true); setMessage("")
    try { await apiFetch<Consent>("/discovery/consent", { method: "POST", json: { active: true, shared_fields: ["profession", "skills"], share_portfolio: portfolio, share_linkedin: linkedin, share_x: x, publications_last_7_days: activity ? 0 : null, linkedin_url: linkedin ? linkedinUrl || null : null, x_url: x ? xUrl || null : null } }); setSaved(true); setActive(true); setMessage("Preferencias guardadas.") }
    catch { setMessage("No pudimos guardar estos ajustes. El onboarding sigue disponible; podés reintentar.") }
    finally { setBusy(false) }
  }
  async function revoke() {
    setBusy(true); setMessage("")
    try { await apiFetch<void>("/discovery/consent", { method: "DELETE" }); setActive(false); setSaved(true); setMessage("Visibilidad revocada.") }
    catch { setMessage("No pudimos revocar ahora. Intentá de nuevo.") }
    finally { setBusy(false) }
  }
  return <section aria-labelledby="discovery-title" className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
    <h2 id="discovery-title" className="font-display text-xl text-ink">Visibilidad para empresas <span className="text-sm font-sans text-ink-muted">(opcional)</span></h2>
    <p className="mt-2 text-sm text-ink-muted">Vos elegís qué compartir. Podés cambiarlo o revocarlo cuando quieras.</p>
    <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} /><span>Quiero que empresas puedan encontrar mi perfil</span></label>
    <div className="mt-3 grid gap-3 pl-7 text-sm">
      <label className="flex gap-3"><input type="checkbox" checked={portfolio} onChange={e=>setPortfolio(e.target.checked)} />Compartir portfolio</label>
      <label className="flex gap-3"><input type="checkbox" checked={linkedin} onChange={e=>setLinkedin(e.target.checked)} />Compartir LinkedIn</label>
      {linkedin&&<label className="text-xs">Enlace de LinkedIn<input value={linkedinUrl} onChange={e=>setLinkedinUrl(e.target.value)} type="url" className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm" placeholder="https://www.linkedin.com/in/…" /></label>}
      <label className="flex gap-3"><input type="checkbox" checked={x} onChange={e=>setX(e.target.checked)} />Compartir X</label>
      {x&&<label className="text-xs">Enlace de X<input value={xUrl} onChange={e=>setXUrl(e.target.value)} type="url" className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm" placeholder="https://x.com/…" /></label>}
      <label className="flex gap-3"><input type="checkbox" checked={activity} onChange={e=>setActivity(e.target.checked)} />Compartir cantidad de publicaciones de los últimos 7 días</label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void save()} className="rounded-full bg-accent-strong px-4 py-2 text-sm text-white disabled:opacity-50">{busy?"Guardando…":"Guardar preferencias"}</button>{saved&&active&&<button type="button" disabled={busy} onClick={()=>void revoke()} className="rounded-full border border-hairline px-4 py-2 text-sm">Revocar consentimiento</button>}</div>
    {message&&<p role="status" aria-live="polite" className="mt-3 text-sm text-ink-muted">{message}</p>}
  </section>
}

function Stepper({
  step,
  visited,
  isDone,
  canGoTo,
  goTo,
}: {
  step: number
  visited: Set<number>
  isDone: boolean
  canGoTo: (n: number) => boolean
  goTo: (n: number) => void
}) {
  return (
    <nav aria-label="Pasos del onboarding">
      <ol className="flex flex-col gap-1">
        {STEPS.map((s) => {
          const state = isDone
            ? "done"
            : s.id === step
              ? "current"
              : visited.has(s.id)
                ? "done"
                : "upcoming"
          const inner = (
            <>
              <StepDot state={state} n={s.id} />
              <span className="flex flex-col">
                <span
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" ? "text-on-dark" : "text-inverse",
                  )}
                >
                  {s.title}
                </span>
                <span className="text-xs text-on-dark-muted">{s.short}</span>
              </span>
            </>
          )
          return (
            <li key={s.id}>
              {canGoTo(s.id) && s.id !== step ? (
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  className="pressable focus-ring flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate"
                >
                  {inner}
                </button>
              ) : (
                <span
                  aria-current={!isDone && s.id === step ? "step" : undefined}
                  className="flex items-center gap-3 px-2 py-2"
                >
                  {inner}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function OptionalBadge() {
  return <Badge variant="neutral">Opcional</Badge>
}

function StepIdentity({
  sessionId,
  profile,
  profession,
  setProfession,
  onUploadingChange,
}: {
  sessionId: string
  profile: AuthorProfile
  profession: string
  setProfession: (v: string) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const [touched, setTouched] = useState(false)
  const invalid =
    touched && profession.trim().length > 0 && profession.trim().length < 2

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14">
      <AvatarUploader
        sessionId={sessionId}
        profile={profile}
        onUploadingChange={onUploadingChange}
      />
      <Field invalid={invalid} className="flex-1 lg:max-w-lg lg:pt-2">
        <FieldLabel>Profesión</FieldLabel>
        <Input
          name="profession"
          value={profession}
          autoComplete="organization-title"
          placeholder="Ej: Diseñadora UX/UI"
          onChange={(e) => setProfession(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {invalid ? (
          <FieldError>Escribí al menos 2 caracteres.</FieldError>
        ) : (
          <FieldDescription>Solo la usamos para ajustar el tono de tus posts.</FieldDescription>
        )}
      </Field>
    </div>
  )
}

function AvatarUploader({
  sessionId,
  profile,
  onUploadingChange,
}: {
  sessionId: string
  profile: AuthorProfile
  onUploadingChange: (uploading: boolean) => void
}) {
  const upload = useUploadPhoto(sessionId)
  const [preview, setPreview] = useState<string | null>(() =>
    getPhotoPreview(profile.photo_id),
  )
  const [error, setError] = useState<string>()

  async function onFile(file: File) {
    setError(undefined)
    const previous = preview
    const dataUrl = await fileToPreviewDataUrl(file).catch(() => null)
    if (dataUrl) setPreview(dataUrl)
    onUploadingChange(true)
    try {
      const updated = await upload.mutateAsync(file)
      if (dataUrl && updated.photo_id) savePhotoPreview(updated.photo_id, dataUrl)
    } catch {
      setPreview(previous)
      setError("No pudimos subir la foto. Probá de nuevo o elegí otra.")
    } finally {
      onUploadingChange(false)
    }
  }

  return (
    <Field invalid={Boolean(error)} className="shrink-0">
      <FieldLabel>Foto de perfil</FieldLabel>
      <FileInput
        accept="image/jpeg,image/png,image/webp"
        maxSize={MAX_FILE}
        onValueChange={(files) => {
          const file = files[0]
          if (file) void onFile(file)
        }}
        onReject={(rejected) => {
          const reasons = rejected[0]?.reasons ?? []
          setError(
            reasons.includes("file-too-large")
              ? "La imagen no puede superar 10 MB."
              : "Tiene que ser una imagen JPEG, PNG o WebP.",
          )
        }}
      >
        <div className="mt-1 flex items-center gap-5 lg:flex-col lg:items-start">
          <FileInputDropzone
            aria-label={preview ? "Cambiar foto de perfil" : "Subir foto de perfil"}
            className={cn(
              "group relative size-24 shrink-0 gap-0 overflow-hidden rounded-full p-0 lg:size-36",
              preview && "border-0 bg-transparent shadow-raised",
            )}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Tu foto de perfil"
                  className="absolute inset-0 size-full object-cover"
                />
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-night/55 text-inverse transition-opacity duration-200",
                    upload.isPending ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  {upload.isPending ? (
                    <Spinner className="size-5" />
                  ) : (
                    <Camera aria-hidden className="size-5" />
                  )}
                </span>
              </>
            ) : (
              <ImagePlus aria-hidden className="size-7 text-ink-muted lg:size-8" />
            )}
          </FileInputDropzone>
          <div className="flex flex-col items-start gap-2">
            <FileInputTrigger disabled={upload.isPending}>
              {upload.isPending ? "Subiendo…" : preview ? "Cambiar foto" : "Elegir foto"}
            </FileInputTrigger>
            <p className="text-xs text-ink-muted">JPEG, PNG o WebP · hasta 10 MB</p>
          </div>
        </div>
      </FileInput>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function StepVoice({
  sessionId,
  profile,
  sample,
  setSample,
  onSaveSample,
}: {
  sessionId: string
  profile: AuthorProfile
  sample: string
  setSample: (v: string) => void
  onSaveSample: (value?: string) => Promise<void>
}) {
  const hasPosts = countSamplePosts(profile) > 0

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
      <SocialSync />
      <VoiceSample
        value={sample}
        onChange={setSample}
        onBlur={() => void onSaveSample()}
        onTranscript={(text) => void onSaveSample(text)}
        minLength={MIN_SAMPLE}
        required={!hasPosts}
      />
      <div className="flex flex-col gap-8">
        <section aria-labelledby="redes-title" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 id="redes-title" className="text-[13px] font-medium text-ink">
              Sumá tus posts
            </h2>
            <OptionalBadge />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SocialCard platform="linkedin" sessionId={sessionId} imported={profile.style_sync.linkedin} beforeConnect={onSaveSample} />
            <SocialCard platform="x" sessionId={sessionId} imported={profile.style_sync.x} beforeConnect={onSaveSample} />
          </div>
        </section>
        <CvUploader sessionId={sessionId} profile={profile} />
      </div>
    </div>
  )
}

function SocialSync() {
  const router = useRouter()
  const { mutate } = useSyncStyle(useSessionId().data)
  const handled = useRef(false)
  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(window.location.search)
    const connected = params.get("connected")
    if (connected === "linkedin" || connected === "x") {
      handled.current = true
      mutate({})
      params.delete("connected")
      const qs = params.toString()
      router.replace(qs ? `/onboarding?${qs}` : "/onboarding", { scroll: false })
    }
  }, [mutate, router])
  return null
}

function SocialCard({
  platform,
  sessionId,
  imported,
  beforeConnect,
}: {
  platform: Platform
  sessionId: string
  imported: StyleSyncResult
  beforeConnect: () => Promise<void>
}) {
  const connection = useSocialConnection(platform, sessionId)
  const connect = useConnectSocial(platform, sessionId)
  const status = connection.data
  const state = status?.status ?? "disconnected"
  const name = PLATFORM_NAMES[platform]

  let body: ReactNode
  if (connection.isPending) body = <Skeleton className="h-4 w-3/4" />
  else if (state === "connected")
    body = (
      <>
        {status?.account_handle && <span className="block text-ink">{status.account_handle}</span>}
        {imported.posts_imported > 0
          ? `Aprendimos de ${imported.posts_imported} post${imported.posts_imported === 1 ? "" : "s"} tuyos.`
          : "Conectada. Todavía no leímos posts."}
      </>
    )
  else if (state === "access_unavailable")
    body = `Por ahora no podemos leer tus posts de ${name}.`
  else if (state === "expired") body = "La conexión venció. Volvé a conectarla."
  else body = "Leemos tus últimos posts para aprender tu tono."

  const canConnect = state === "disconnected" || state === "expired"

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-fill-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{name}</span>
        {state === "connected" ? (
          <Badge variant="accent">
            <Check aria-hidden />
            Conectada
          </Badge>
        ) : state === "access_unavailable" ? (
          <Badge variant="outline">No disponible</Badge>
        ) : state === "expired" ? (
          <Badge variant="outline">Vencida</Badge>
        ) : null}
      </div>
      <div className="text-xs leading-relaxed text-ink-muted">{body}</div>
      {canConnect && (
        <div className="mt-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={connect.isPending}
            onClick={async () => {
              await beforeConnect()
              connect.mutate("/onboarding?step=2")
            }}
          >
            {connect.isPending
              ? "Abriendo…"
              : state === "expired"
                ? `Reconectar ${name}`
                : `Conectar ${name}`}
          </Button>
        </div>
      )}
    </div>
  )
}

function CvUploader({
  sessionId,
  profile,
}: {
  sessionId: string
  profile: AuthorProfile
}) {
  const upload = useUploadCv(sessionId)
  const [error, setError] = useState<string>()
  const [fileName, setFileName] = useState<string>()
  const cv = profile.cv_document

  return (
    <Field invalid={Boolean(error)}>
      <div className="flex items-center gap-2">
        <FieldLabel>Tu CV</FieldLabel>
        <OptionalBadge />
      </div>
      <FileInput
        accept=".pdf,application/pdf"
        maxSize={MAX_FILE}
        onValueChange={(files) => {
          const file = files[0]
          if (!file) return
          setError(undefined)
          setFileName(file.name)
          upload.mutate(file, {
            onError: () => setError("No pudimos subir el CV. Probá de nuevo."),
          })
        }}
        onReject={(rejected) => {
          const reasons = rejected[0]?.reasons ?? []
          setError(
            reasons.includes("file-too-large")
              ? "El CV no puede superar 10 MB."
              : "El CV tiene que ser un PDF.",
          )
        }}
      >
        {cv || upload.isPending ? (
          <div className="flex items-center gap-3 rounded-[18px] bg-fill-soft p-3 pr-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-paper text-ink shadow-raised">
              {upload.isPending ? <Spinner className="size-4" /> : <FileCheck aria-hidden className="size-5" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5" aria-live="polite">
              <p className="truncate text-sm font-medium text-ink">{fileName ?? "Tu CV"}</p>
              <p className="text-xs text-ink-muted">
                {upload.isPending
                  ? "Subiendo…"
                  : `Guardado${cv?.size_bytes ? ` · ${formatFileSize(cv.size_bytes)}` : ""}`}
              </p>
            </div>
            <FileInputTrigger disabled={upload.isPending}>Cambiar</FileInputTrigger>
          </div>
        ) : (
          <FileInputDropzone className="flex-row justify-start gap-3 px-4 py-4 text-left">
            <FileText aria-hidden className="size-5 shrink-0 text-ink-muted" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-ink">Subí tu CV en PDF</span>
              <span className="text-xs text-ink-muted">Hasta 10 MB</span>
            </span>
            <FileInputTrigger>Elegir PDF</FileInputTrigger>
          </FileInputDropzone>
        )}
      </FileInput>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>
          Lo guardamos privado para armar tu portfolio más adelante. No lo usamos para tus posts.
        </FieldDescription>
      )}
    </Field>
  )
}

function ProfileRows({
  profile,
  goToStep,
}: {
  profile: AuthorProfile
  goToStep?: (n: number) => void
}) {
  const preview = getPhotoPreview(profile.photo_id)
  const voice = voiceSources(profile)
  const rows = [
    { id: "profession", label: "Profesión", step: 1, content: profile.profession ?? "Falta" },
    {
      id: "photo",
      label: "Foto",
      step: 1,
      content: preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Tu foto de perfil"
          width={48}
          height={48}
          className="size-12 rounded-full object-cover shadow-raised"
        />
      ) : profile.photo_id ? (
        "Cargada"
      ) : (
        "Falta"
      ),
    },
    { id: "voice", label: "Tu voz", step: 2, content: voice.length ? capitalize(listToText(voice)) : "Falta" },
    { id: "cv", label: "CV", step: 2, content: profile.cv_document ? "Guardado" : "Sin CV (opcional)" },
  ]

  return (
    <dl className="flex max-w-3xl flex-col">
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-x-4 border-b border-divider py-3.5 last:border-0 lg:grid-cols-[8rem_1fr_auto]"
        >
          <dt className="text-xs font-medium text-ink-muted">{row.label}</dt>
          <dd className="min-w-0 text-sm text-ink">{row.content}</dd>
          {goToStep ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Editar ${row.label.toLowerCase()}`}
              onClick={() => goToStep(row.step)}
            >
              Editar
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
    </dl>
  )
}

function DonePanel({
  profile,
  headingRef,
}: {
  profile: AuthorProfile
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
          <Check aria-hidden className="size-6" />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[28px] leading-tight tracking-display text-ink outline-none lg:text-[40px]"
        >
          ¡Listo!
        </h1>
        <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">
          Tu perfil está completo. Ya podemos armar tu primer post con tu voz.
        </p>
      </div>
      <ProfileRows profile={profile} />
    </div>
  )
}

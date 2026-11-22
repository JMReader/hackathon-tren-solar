"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Check, ChevronLeft, FileText, ImagePlus } from "lucide-react"
import type { AuthorProfile, Platform } from "@/lib/api/types"
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
  FileInputItem,
  FileInputList,
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"

const PLATFORM_NAMES: Record<Platform, string> = { linkedin: "LinkedIn", x: "X" }
const MIN_SAMPLE = 20
const MAX_FILE = 10 * 1024 * 1024

const STEPS = [
  { id: 1, title: "Sobre vos", subtitle: "Quién sos y tu foto" },
  { id: 2, title: "Tu voz", subtitle: "Cómo escribís, en tus palabras" },
  { id: 3, title: "CV", subtitle: "Opcional, para tu portfolio" },
  { id: 4, title: "Listo", subtitle: "Revisá y confirmá" },
]

function countSamplePosts(profile: AuthorProfile, platform?: Platform) {
  const posts = profile.voice_context?.sample_posts
  if (platform) return posts?.[platform]?.length ?? 0
  return (posts?.linkedin?.length ?? 0) + (posts?.x?.length ?? 0)
}

function initialStep() {
  if (typeof window === "undefined") return 1
  const raw = Number(new URLSearchParams(window.location.search).get("step"))
  return raw >= 1 && raw <= 4 ? raw : 1
}

export function Onboarding() {
  const session = useSessionId()
  const sessionId = session.data
  const profile = useProfile(sessionId)

  if (session.isError || profile.isError)
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>No pudimos cargar tu perfil</CardTitle>
          </CardHeader>
          <CardContent>
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

  if (session.isPending || !profile.data)
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:py-14">
        <Skeleton className="h-9 w-40 bg-slate" />
        <Skeleton className="h-4 w-64 bg-slate" />
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </main>
    )

  return <Wizard sessionId={sessionId!} profile={profile.data} />
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
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  const update = useUpdateProfile(sessionId)
  const complete = useCompleteOnboarding(sessionId)
  const isDone = profile.onboarding_status === "complete"
  const posts = countSamplePosts(profile)
  const step1Done = profession.trim().length >= 2 && Boolean(profile.photo_id)
  const step2Done = posts > 0 || sample.trim().length >= MIN_SAMPLE

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0 })
  }, [step])

  function canGoTo(n: number) {
    if (!(visited.has(n) || n === step + 1)) return false
    if (n > step && n >= 2 && !step1Done) return false
    if (n > step && n >= 3 && !step2Done) return false
    return true
  }

  function goTo(n: number) {
    if (!canGoTo(n)) return
    setVisited((v) => new Set(v).add(n))
    setStep(n)
    router.replace(`/?step=${n}`, { scroll: false })
  }

  async function next() {
    try {
      if (step === 1) {
        const next_ = profession.trim()
        if (next_ !== (profile.profession ?? ""))
          await update.mutateAsync({ profession: next_ })
        goTo(2)
      } else if (step === 2) {
        if (sample !== (profile.writing_sample ?? ""))
          await update.mutateAsync({ writing_sample: sample })
        goTo(3)
      } else if (step === 3) {
        goTo(4)
      }
    } catch {
      // el toast del hook ya avisa; no avanzamos si el guardado falló
    }
  }

  const current = STEPS[step - 1]

  return (
    <div className="flex flex-1 flex-col lg:grid lg:min-h-dvh lg:grid-cols-[380px_1fr]">
      <aside className="hidden bg-night px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex flex-col gap-10">
          <header className="flex flex-col gap-2">
            <p className="font-display text-3xl tracking-display text-inverse">
              Tren Solar
            </p>
            <p className="text-sm leading-relaxed text-on-dark-muted">
              Contanos quién sos y cómo escribís. Nosotros armamos tus posts.
            </p>
          </header>
          <nav aria-label="Pasos del onboarding">
            <ol className="flex flex-col gap-1">
              {STEPS.map((s) => {
                const state =
                  s.id === step
                    ? "current"
                    : visited.has(s.id)
                      ? "done"
                      : "upcoming"
                const inner = (
                  <>
                    <span
                      aria-hidden
                      className={
                        state === "current"
                          ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-strong text-xs font-semibold text-white"
                          : state === "done"
                            ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-deep"
                            : "flex size-7 shrink-0 items-center justify-center rounded-full border border-on-dark-muted/40 text-xs text-on-dark-muted"
                      }
                    >
                      {state === "done" ? <Check className="size-3.5" /> : s.id}
                    </span>
                    <span className="flex flex-col">
                      <span
                        className={
                          state === "upcoming"
                            ? "text-sm font-medium text-on-dark-muted"
                            : "text-sm font-medium text-inverse"
                        }
                      >
                        {s.title}
                      </span>
                      <span className="text-xs text-on-dark-muted">
                        {s.subtitle}
                      </span>
                    </span>
                  </>
                )
                return (
                  <li key={s.id}>
                    {canGoTo(s.id) && s.id !== step ? (
                      <button
                        type="button"
                        onClick={() => goTo(s.id)}
                        className="focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate"
                      >
                        {inner}
                      </button>
                    ) : (
                      <span
                        aria-current={s.id === step ? "step" : undefined}
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
        </div>
        <p className="text-[13px] text-on-dark-muted">
          Nada se publica sin tu OK.
        </p>
      </aside>

      <div className="flex flex-1 flex-col lg:min-h-dvh lg:bg-cream">
        <div className="flex flex-col gap-3 px-4 pt-8 lg:hidden">
          <p className="font-display text-2xl tracking-display text-inverse">
            Tren Solar
          </p>
          <p className="text-[13px] text-on-dark-muted">
            Paso {step} de 4 · {current.title}
          </p>
          <Progress
            value={(step / 4) * 100}
            aria-label={`Paso ${step} de 4`}
            className="[&>[data-slot=progress-track]]:bg-slate"
          >
            <ProgressTrack className="h-1.5 bg-slate">
              <ProgressIndicator className="bg-accent" />
            </ProgressTrack>
          </Progress>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-5 pb-4 lg:px-16 lg:pt-14">
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:mx-0 lg:max-w-[640px]">
            <div
              key={step}
              className="animate-step-in rounded-[22px] bg-paper p-5 shadow-raised motion-reduce:animate-none lg:flex-1 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
            >
              {isDone ? (
                <DonePanel headingRef={headingRef} />
              ) : (
                <>
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="font-display text-2xl tracking-display text-ink outline-none sm:text-4xl"
                  >
                    {current.title}
                  </h1>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {current.subtitle}
                  </p>
                  <div className="mt-6">
                    {step === 1 && (
                      <StepIdentity
                        sessionId={sessionId}
                        profile={profile}
                        profession={profession}
                        setProfession={setProfession}
                      />
                    )}
                    {step === 2 && (
                      <StepVoice
                        sessionId={sessionId}
                        profile={profile}
                        sample={sample}
                        setSample={setSample}
                      />
                    )}
                    {step === 3 && (
                      <StepCv sessionId={sessionId} profile={profile} />
                    )}
                    {step === 4 && (
                      <StepSummary profile={profile} goToStep={goTo} />
                    )}
                  </div>
                </>
              )}
            </div>

            {!isDone && (
              <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-hairline bg-night/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mx-0 lg:mt-auto lg:bg-transparent lg:px-0 lg:pt-6 lg:pb-0 lg:backdrop-blur-none">
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
                <div className="ml-auto flex items-center gap-2">
                  {step === 3 && (
                    <Button
                      variant="ghost"
                      className="text-inverse hover:bg-slate lg:text-ink lg:hover:bg-fill-soft"
                      onClick={() => goTo(4)}
                    >
                      Saltar
                    </Button>
                  )}
                  {step < 4 ? (
                    <Button
                      disabled={
                        (step === 1 && !step1Done) ||
                        (step === 2 && !step2Done) ||
                        (step === 3 && !profile.cv_document) ||
                        update.isPending
                      }
                      onClick={() => void next()}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button
                      disabled={
                        !profile.ready_for_achievement || complete.isPending
                      }
                      onClick={() => complete.mutate()}
                    >
                      Terminar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepIdentity({
  sessionId,
  profile,
  profession,
  setProfession,
}: {
  sessionId: string
  profile: AuthorProfile
  profession: string
  setProfession: (v: string) => void
}) {
  const [touched, setTouched] = useState(false)
  const invalid =
    touched && profession.trim().length > 0 && profession.trim().length < 2

  return (
    <div className="flex flex-col gap-5">
      <Field invalid={invalid}>
        <FieldLabel>Profesión</FieldLabel>
        <Input
          name="profession"
          value={profession}
          placeholder="Ej: Diseñadora UX/UI"
          onChange={(e) => setProfession(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {invalid ? (
          <FieldError>Contanos al menos 2 caracteres.</FieldError>
        ) : (
          <FieldDescription>
            Se usa como pista de estilo, no como hecho.
          </FieldDescription>
        )}
      </Field>
      <PhotoPicker sessionId={sessionId} profile={profile} />
    </div>
  )
}

function PhotoPicker({
  sessionId,
  profile,
}: {
  sessionId: string
  profile: AuthorProfile
}) {
  const upload = useUploadPhoto(sessionId)
  const [preview, setPreview] = useState<string | null>(() =>
    getPhotoPreview(profile.photo_id),
  )
  const [error, setError] = useState<string>()

  async function onFile(file: File) {
    setError(undefined)
    const dataUrl = await fileToPreviewDataUrl(file).catch(() => null)
    if (dataUrl) setPreview(dataUrl)
    try {
      const updated = await upload.mutateAsync(file)
      if (dataUrl && updated.photo_id)
        savePhotoPreview(updated.photo_id, dataUrl)
    } catch {
      toast.error("No se pudo subir la foto", {
        description: "Probá con otra imagen.",
      })
    }
  }

  return (
    <Field invalid={Boolean(error)}>
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
        {preview ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Tu foto de perfil"
              className="size-24 shrink-0 rounded-full object-cover shadow-raised"
            />
            <div className="flex flex-col items-start gap-1.5">
              <p className="text-sm font-medium text-ink">Foto lista</p>
              <FileInputTrigger>Cambiar</FileInputTrigger>
            </div>
          </div>
        ) : (
          <FileInputDropzone>
            <ImagePlus aria-hidden className="size-6 text-ink-muted" />
            <p className="text-sm font-medium text-ink">
              Arrastrá tu foto o tocá para elegir
            </p>
            <p className="text-xs text-ink-muted">
              JPEG, PNG o WebP · hasta 10 MB
            </p>
            <FileInputTrigger>
              {upload.isPending ? "Subiendo…" : "Elegir foto"}
            </FileInputTrigger>
          </FileInputDropzone>
        )}
      </FileInput>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>
          Va en tu perfil; no se comparte sola.
        </FieldDescription>
      )}
    </Field>
  )
}

function StepVoice({
  sessionId,
  profile,
  sample,
  setSample,
}: {
  sessionId: string
  profile: AuthorProfile
  sample: string
  setSample: (v: string) => void
}) {
  const update = useUpdateProfile(sessionId)
  const [touched, setTouched] = useState(false)
  const hasPosts = countSamplePosts(profile) > 0
  const tooShort = sample.trim().length < MIN_SAMPLE
  const showError =
    touched && !hasPosts && tooShort && sample.trim().length > 0

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-ink-muted">
        Si conectás tu cuenta, leemos tus posts para aprender cómo escribís. No
        publicamos nada.
      </p>
      <SocialSync />
      <div className="grid gap-3 lg:grid-cols-2">
        <SocialCard
          platform="linkedin"
          sessionId={sessionId}
          imported={profile.style_sync.linkedin}
        />
        <SocialCard
          platform="x"
          sessionId={sessionId}
          imported={profile.style_sync.x}
        />
      </div>
      <Field invalid={showError}>
        <FieldLabel>
          Muestra de escritura{!hasPosts && " (obligatoria)"}
        </FieldLabel>
        <Textarea
          name="writing_sample"
          value={sample}
          rows={4}
          placeholder="Contá algo a tu manera…"
          onChange={(e) => setSample(e.target.value)}
          onBlur={() => {
            setTouched(true)
            if (
              sample !== (profile.writing_sample ?? "") &&
              !tooShort
            )
              update.mutate({ writing_sample: sample })
          }}
        />
        <div className="flex items-baseline justify-between gap-3">
          {showError ? (
            <FieldError>
              Necesitamos al menos {MIN_SAMPLE} caracteres para imitar tu tono.
            </FieldError>
          ) : (
            <FieldDescription>
              Escribí como te salga — por ejemplo, cómo ganaste algo en una
              hackathon. No te preocupes por la ortografía ni la puntuación:
              nosotros lo acomodamos.
            </FieldDescription>
          )}
          <span className="shrink-0 text-xs text-ink-faint tabular-nums">
            {sample.trim().length}/{MIN_SAMPLE} mínimo
          </span>
        </div>
      </Field>
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
      router.replace(qs ? `/?${qs}` : "/", { scroll: false })
    }
  }, [mutate, router])
  return null
}

function SocialCard({
  platform,
  sessionId,
  imported,
}: {
  platform: Platform
  sessionId: string
  imported: { status: string; posts_imported: number }
}) {
  const connection = useSocialConnection(platform, sessionId)
  const connect = useConnectSocial(platform, sessionId)
  const status = connection.data
  const state = status?.status ?? "disconnected"

  return (
    <div className="flex flex-col gap-2 rounded-[18px] bg-fill-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            {PLATFORM_NAMES[platform]}
          </span>
          <Badge variant="neutral">Opcional</Badge>
        </div>
        {state === "connected" ? (
          <Badge variant="accent">Conectado</Badge>
        ) : state === "access_unavailable" ? (
          <Badge variant="danger">No disponible</Badge>
        ) : state === "expired" ? (
          <Badge variant="neutral">Venció</Badge>
        ) : (
          <Badge variant="outline">No conectado</Badge>
        )}
      </div>
      {status?.account_handle && (
        <p className="text-xs text-ink-muted">{status.account_handle}</p>
      )}
      {status?.reason && (
        <p className="text-xs leading-relaxed text-ink-muted">{status.reason}</p>
      )}
      {imported.posts_imported > 0 && (
        <p className="text-xs font-medium text-accent-deep">
          Importamos {imported.posts_imported} posts tuyos.
        </p>
      )}
      <div>
        <Button
          variant="outline"
          size="sm"
          disabled={
            state === "connected" ||
            state === "access_unavailable" ||
            connect.isPending
          }
          onClick={() => connect.mutate("/?step=2")}
        >
          {state === "connected" ? "Conectado" : "Conectar"}
        </Button>
      </div>
    </div>
  )
}

function StepCv({
  sessionId,
  profile,
}: {
  sessionId: string
  profile: AuthorProfile
}) {
  const upload = useUploadCv(sessionId)
  const [error, setError] = useState<string>()

  return (
    <Field invalid={Boolean(error)}>
      <div className="flex items-center gap-2">
        <FieldLabel>CV</FieldLabel>
        <Badge variant="neutral">Opcional</Badge>
        {profile.cv_document && <Badge variant="accent">Guardado</Badge>}
      </div>
      <FileInput
        accept=".pdf"
        maxSize={MAX_FILE}
        onValueChange={(files) => {
          const file = files[0]
          if (file) {
            setError(undefined)
            upload.mutate(file)
          }
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
        <FileInputDropzone>
          <FileText aria-hidden className="size-6 text-ink-muted" />
          <p className="text-sm font-medium text-ink">
            {upload.isPending ? "Subiendo…" : "Subí tu CV en PDF"}
          </p>
          <p className="text-xs text-ink-muted">
            Opcional — lo guardamos para tu portfolio más adelante.
          </p>
          <FileInputTrigger>Elegir PDF</FileInputTrigger>
        </FileInputDropzone>
        <FileInputList aria-label="CV elegido">
          <FileInputItem>
            {({ file }) => (
              <>
                <span className="truncate">{file.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
                  {formatFileSize(file.size)}
                </span>
              </>
            )}
          </FileInputItem>
        </FileInputList>
      </FileInput>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function StepSummary({
  profile,
  goToStep,
}: {
  profile: AuthorProfile
  goToStep: (n: number) => void
}) {
  const preview = getPhotoPreview(profile.photo_id)
  const voice: string[] = []
  if (countSamplePosts(profile, "linkedin") > 0)
    voice.push(`${countSamplePosts(profile, "linkedin")} posts de LinkedIn`)
  if (countSamplePosts(profile, "x") > 0)
    voice.push(`${countSamplePosts(profile, "x")} posts de X`)
  if ((profile.writing_sample?.trim().length ?? 0) >= MIN_SAMPLE)
    voice.push("Tu muestra de escritura")

  const rows = [
    {
      id: "profession",
      label: "Profesión",
      step: 1,
      content: (
        <span className="text-sm text-ink">{profile.profession ?? "—"}</span>
      ),
    },
    {
      id: "photo",
      label: "Foto",
      step: 1,
      content: preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Tu foto de perfil"
          className="size-16 rounded-full object-cover shadow-raised"
        />
      ) : (
        <span className="text-sm text-ink">
          {profile.photo_id ? "Foto cargada" : "—"}
        </span>
      ),
    },
    {
      id: "voice",
      label: "Tu voz",
      step: 2,
      content: (
        <span className="text-sm text-ink">
          {voice.length ? voice.join(" · ") : "—"}
        </span>
      ),
    },
    {
      id: "cv",
      label: "CV",
      step: 3,
      content: (
        <span className="text-sm text-ink">
          {profile.cv_document ? "Subido" : "No"}
        </span>
      ),
    },
  ]

  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-4 border-b border-divider py-3 last:border-0"
        >
          <div className="flex min-w-0 items-center gap-4">
            <span className="w-20 shrink-0 text-xs font-medium text-ink-muted">
              {row.label}
            </span>
            {row.content}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(row.step)}
          >
            Editar
          </Button>
        </li>
      ))}
    </ul>
  )
}

function DonePanel({
  headingRef,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center lg:items-start lg:text-left">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        <Check aria-hidden className="size-7" />
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl tracking-display text-ink outline-none sm:text-4xl"
      >
        ¡Listo!
      </h1>
      <p className="max-w-[40ch] text-[15px] leading-relaxed text-ink-muted">
        Ya podemos armar tu primer post.
      </p>
    </div>
  )
}

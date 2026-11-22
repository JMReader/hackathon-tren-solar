"use client"

import { ArrowRight, ImagePlus, Mic, PenLine, RotateCcw, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  AudioPlayerButton,
  AudioPlayerDuration,
  AudioPlayerProvider,
  AudioPlayerScrubber,
  AudioPlayerTime,
} from "@/components/audio/audio-player"
import { MicSelector } from "@/components/audio/mic-selector"
import { Orb } from "@/components/audio/orb"
import { ShimmeringText } from "@/components/audio/shimmering-text"
import { formatDuration, useRecorder } from "@/components/audio/use-recorder"
import { useSpeechTranscript } from "@/components/audio/use-speech-transcript"
import { useStreamVolume } from "@/components/audio/use-stream-volume"
import { seededPeaks, useAudioPeaks } from "@/components/audio/waveform"
import { Badge, StatusDot } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FileInput, FileInputDropzone, FileInputTrigger } from "@/components/ui/file-input"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorCode, apiErrorMessage, useCreateAchievement, type CreateAchievementInput } from "@/lib/api/achievements"
import type { Achievement } from "@/lib/api/types"
import { fileToPreviewDataUrl, savePhotoPreview } from "@/lib/photo-preview"
import { cn } from "@/lib/utils"
import { NeedsOnboarding, PageSkeleton, useAppSession } from "./common"
import { AppPage, CreateSteps, PageTitle } from "./shell"

const MAX_SECONDS = 120
const MIN_TEXT = 10
const MAX_FILE = 10 * 1024 * 1024
const ON_DARK_SHIMMER =
  "bg-[linear-gradient(100deg,var(--color-on-dark-muted)_35%,var(--color-inverse)_50%,var(--color-on-dark-muted)_65%)] motion-reduce:text-on-dark-muted"

type Mode = "speak" | "write"
type Photo = { file: File; preview: string }

function useRotating(items: string[], active: boolean, ms = 2400) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setI((n) => (n + 1) % items.length), ms)
    return () => clearInterval(t)
  }, [active, items.length, ms])
  return items[i % items.length]
}

function Recorder({
  recorder,
  deviceId,
  onDeviceChange,
  onReset,
}: {
  recorder: ReturnType<typeof useRecorder>
  deviceId: string | undefined
  onDeviceChange: (id: string | undefined) => void
  onReset: () => void
}) {
  const speech = useSpeechTranscript()
  const getVolume = useStreamVolume(recorder.stream)
  const { peaks } = useAudioPeaks(recorder.blob)
  const recording = recorder.status === "recording"
  const stopped = recorder.status === "stopped" && Boolean(recorder.url)
  const { start: startSpeech, stop: stopSpeech } = speech

  useEffect(() => {
    if (recording && speech.supported) startSpeech()
    else stopSpeech()
  }, [recording, speech.supported, startSpeech, stopSpeech])

  useEffect(() => {
    if (recording && recorder.elapsed >= MAX_SECONDS) recorder.stop()
  }, [recording, recorder])

  return (
    <section aria-label="Grabar tu logro" className="overflow-hidden rounded-[22px] bg-night text-inverse shadow-raised">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
        <MicSelector
          value={deviceId}
          onValueChange={(id) => {
            onDeviceChange(id)
            recorder.reset()
          }}
          disabled={recording}
          className="-ml-1 w-auto max-w-[65%] text-on-dark hover:bg-white/10 hover:text-inverse"
        />
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap tabular-nums",
            recording ? "bg-accent-strong text-white" : "bg-slate text-on-dark",
          )}
        >
          {recording && <StatusDot className="animate-pulse motion-reduce:animate-none" />}
          {recording ? "Grabando" : stopped ? "Audio listo" : formatDuration(0)}
        </span>
      </div>

      {stopped && recorder.url ? (
        <div className="px-4 py-6 sm:px-5">
          <AudioPlayerProvider src={recorder.url} duration={recorder.elapsed}>
            <div className="flex items-center gap-4">
              <AudioPlayerButton variant="primary" size="lg" className="size-12 shrink-0 px-0" />
              <div className="min-w-0 flex-1">
                <AudioPlayerScrubber peaks={peaks ?? seededPeaks(recorder.url)} height={44} tone="dark" />
                <div className="mt-1.5 flex justify-between">
                  <AudioPlayerTime className="text-on-dark-muted" />
                  <AudioPlayerDuration className="text-on-dark-muted" />
                </div>
              </div>
            </div>
          </AudioPlayerProvider>
          <p className="mt-5 font-display text-[16px] leading-relaxed text-on-dark italic">
            {speech.transcript ? `“${speech.transcript}”` : "Listo. Escuchalo antes de seguir."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 pt-7 pb-5 sm:px-5">
          <div className={cn("transition-[scale] duration-500 ease-out", recording ? "scale-105" : "scale-100")}>
            <Orb
              state={recording ? "listening" : "idle"}
              getVolume={recording ? getVolume : undefined}
              inverted
              className="size-40 sm:size-48"
              label={recording ? "Grabando: el orbe reacciona a tu voz" : "Listo para grabar"}
            />
          </div>
          <p
            className={cn(
              "font-display text-[30px] font-light tracking-display tabular-nums",
              recording ? "text-inverse" : "text-on-dark-muted",
            )}
          >
            {formatDuration(recorder.elapsed)}
            {recording && <span className="ml-2 text-base text-on-dark-muted">/ {formatDuration(MAX_SECONDS)}</span>}
          </p>
          <p aria-live="polite" className="min-h-[3.25rem] max-w-[46ch] text-center font-display text-[16px] leading-relaxed text-on-dark italic">
            {recording ? (
              speech.transcript || speech.interim ? (
                <>
                  <span className="text-inverse">{speech.transcript}</span>{" "}
                  {speech.interim && <ShimmeringText className={ON_DARK_SHIMMER}>{speech.interim}</ShimmeringText>}
                </>
              ) : (
                <ShimmeringText className={ON_DARK_SHIMMER}>Te escuchamos…</ShimmeringText>
              )
            ) : (
              "“Contá qué hiciste, con quién y qué resultado tuvo.”"
            )}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
        {recording ? (
          <Button variant="outline" onClick={recorder.stop}>
            <Square aria-hidden className="fill-current" />
            Terminar
          </Button>
        ) : (
          <Button
            variant={stopped ? "dark" : "primary"}
            onClick={() => {
              speech.reset()
              void recorder.start()
            }}
            disabled={recorder.status === "requesting"}
          >
            <Mic aria-hidden />
            {stopped ? "Grabar de nuevo" : "Grabar logro"}
          </Button>
        )}
        {stopped && (
          <Button
            variant="ghost"
            className="text-on-dark hover:bg-white/10 hover:text-inverse"
            onClick={() => {
              speech.reset()
              onReset()
            }}
          >
            <RotateCcw aria-hidden />
            Descartar
          </Button>
        )}
        <p className="ml-auto text-xs text-on-dark-muted">
          {recorder.error ? (
            <span role="alert" className="text-accent-soft">
              {recorder.error.message}
            </span>
          ) : (
            "Se graba en tu navegador y lo mandamos al continuar."
          )}
        </p>
      </div>
    </section>
  )
}

function PhotoPicker({ photo, onChange }: { photo: Photo | null; onChange: (p: Photo | null) => void }) {
  const [error, setError] = useState<string>()
  return (
    <Field invalid={Boolean(error)}>
      <FieldLabel className="flex items-center gap-2">
        Foto del proyecto <Badge variant="accent">Obligatoria</Badge>
      </FieldLabel>
      <FileInput
        accept="image/jpeg,image/png,image/webp"
        maxSize={MAX_FILE}
        onValueChange={async (files) => {
          const file = files[0]
          if (!file) return
          setError(undefined)
          const preview = await fileToPreviewDataUrl(file, 1600).catch(() => null)
          if (!preview) return setError("No pudimos leer la imagen. Probá con otra.")
          onChange({ file, preview })
        }}
        onReject={(rejected) => {
          const reasons = rejected[0]?.reasons ?? []
          setError(reasons.includes("file-too-large") ? "La imagen no puede superar 10 MB." : "Tiene que ser una imagen JPEG, PNG o WebP.")
        }}
      >
        {photo ? (
          <Card className="flex-row items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img src={photo.preview} alt="Foto del proyecto" className="size-20 shrink-0 rounded-2xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{photo.file.name}</span>
              <span className="block text-xs text-ink-muted">Va en los dos posts</span>
            </span>
            <FileInputTrigger className="bg-paper text-ink shadow-raised hover:bg-sunken">Cambiar</FileInputTrigger>
          </Card>
        ) : (
          <FileInputDropzone aria-label="Subir foto del proyecto" className="py-8">
            <ImagePlus aria-hidden className="size-7 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Arrastrá una foto o tocá para elegir</span>
            <span className="text-xs text-ink-muted">Una captura, el equipo o el resultado · JPEG, PNG o WebP hasta 10 MB</span>
            <FileInputTrigger className="mt-1">Elegir foto</FileInputTrigger>
          </FileInputDropzone>
        )}
      </FileInput>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function Processing({ mode }: { mode: Mode }) {
  const message = useRotating(
    mode === "speak"
      ? ["Transcribiendo tu audio…", "Separando los hechos…", "Buscando la cita de cada uno…"]
      : ["Leyendo lo que escribiste…", "Separando los hechos…", "Buscando la cita de cada uno…"],
    true,
  )
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-[22px] bg-night px-6 py-14 text-center lg:min-h-[560px]">
      <Orb state="thinking" inverted className="size-48 sm:size-56" label="Procesando tu logro" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display text-[28px] leading-tight tracking-display text-inverse">Estamos ordenando lo que contaste</h1>
        <p aria-live="polite">
          <ShimmeringText className={ON_DARK_SHIMMER}>{message}</ShimmeringText>
        </p>
        <p className="max-w-[36ch] text-[13px] text-on-dark-muted">No publicamos nada mientras tanto.</p>
      </div>
    </div>
  )
}

export function CreateAchievement() {
  const router = useRouter()
  const { sessionId, profile, isLoading, ready } = useAppSession()
  const create = useCreateAchievement(sessionId)
  const speechSupported = useSpeechTranscript().supported
  const [deviceId, setDeviceId] = useState<string>()
  const recorder = useRecorder({ deviceId })
  const [mode, setMode] = useState<Mode>("speak")
  const [text, setText] = useState("")
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [failed, setFailed] = useState<Achievement | null>(null)

  if (isLoading || !profile)
    return (
      <AppPage>
        <PageSkeleton />
      </AppPage>
    )

  if (create.isPending)
    return (
      <AppPage className="max-lg:bg-night max-lg:p-0">
        <Processing mode={mode} />
      </AppPage>
    )

  const hasAudio = recorder.status === "stopped" && Boolean(recorder.blob)
  const hasInput = mode === "speak" ? hasAudio : text.trim().length >= MIN_TEXT
  const missing: string[] = []
  if (!hasInput) missing.push(mode === "speak" ? "grabar tu logro" : `escribir al menos ${MIN_TEXT} caracteres`)
  if (!photo) missing.push("la foto del proyecto")
  const onboardingBlocked = !ready || apiErrorCode(create.error) === "onboarding_incomplete"

  async function submit() {
    if (!photo || !hasInput) return
    setFailed(null)
    const input: CreateAchievementInput =
      mode === "speak" && recorder.blob
        ? { kind: "audio", audio: recorder.blob, photo: photo.file }
        : { kind: "text", text: text.trim(), photo: photo.file }
    try {
      const achievement = await create.mutateAsync(input)
      if (achievement.photo_id) savePhotoPreview(achievement.photo_id, photo.preview)
      if (achievement.status === "failed") return setFailed(achievement)
      router.push(`/app/crear/${achievement.id}/revisar`)
    } catch {
      // the error card below explains it and keeps audio, text and photo
    }
  }

  return (
    <AppPage>
      <CreateSteps current={1} />
      <PageTitle
        title="Contá tu logro"
        lead="Contalo como se lo contarías a alguien: qué hiciste, con quién y qué salió. Después revisás todo antes de usarlo."
      />

      {onboardingBlocked ? (
        <div className="mt-8">
          <NeedsOnboarding />
        </div>
      ) : (
        <div className="mt-7 grid flex-1 gap-8 lg:mt-10 lg:grid-cols-[1fr_320px] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                value={mode}
                onValueChange={(next) => {
                  if (recorder.status === "recording") recorder.stop()
                  setMode((next as Mode) ?? "speak")
                }}
                aria-label="Cómo querés contarlo"
              >
                <SegmentedControlItem value="speak">
                  <Mic aria-hidden /> Grabar
                </SegmentedControlItem>
                <SegmentedControlItem value="write">
                  <PenLine aria-hidden /> Escribir
                </SegmentedControlItem>
              </SegmentedControl>
              {mode === "speak" && !speechSupported && (
                <p className="text-xs text-ink-muted">Tu navegador no muestra la transcripción en vivo, pero el audio se graba igual.</p>
              )}
            </div>

            {mode === "speak" ? (
              <Recorder recorder={recorder} deviceId={deviceId} onDeviceChange={setDeviceId} onReset={recorder.reset} />
            ) : (
              <Field>
                <FieldLabel>Contalo con tus palabras</FieldLabel>
                <Textarea
                  value={text}
                  rows={8}
                  placeholder="Ej: este finde armamos entre tres una app de turnos para una clínica de Tilcara. Yo diseñé las pantallas…"
                  onChange={(e) => setText(e.target.value)}
                />
                <FieldDescription>Escribí como te salga; nosotros lo ordenamos.</FieldDescription>
              </Field>
            )}

            {(create.isError || failed) && (
              <Card variant="muted" role="alert" className="gap-3 p-5">
                <p className="text-sm font-medium text-danger">
                  {failed ? "No pudimos procesar tu logro" : "No se pudo enviar"}
                </p>
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  {failed?.error?.message ?? apiErrorMessage(create.error, "Revisá tu conexión e intentá de nuevo.")} No
                  perdiste nada: tu audio, tu texto y tu foto siguen acá.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="dark" size="sm" onClick={submit}>
                    <RotateCcw aria-hidden /> Reintentar
                  </Button>
                  {mode === "speak" && (
                    <Button variant="ghost" size="sm" onClick={() => setMode("write")}>
                      <PenLine aria-hidden /> Escribirlo
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <PhotoPicker photo={photo} onChange={setPhoto} />
            <Card variant="muted" className="gap-2 p-5">
              <p className="text-[13px] font-medium text-ink">Qué contar</p>
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-ink-muted">
                <li>Qué hiciste y para quién</li>
                <li>Con quién y qué rol tuviste</li>
                <li>Qué herramientas usaste</li>
                <li>Qué salió o qué aprendiste</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {!onboardingBlocked && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-5 mt-8 flex flex-col gap-2 rounded-b-[22px] bg-paper/95 px-5 pt-4 pb-5 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-auto lg:rounded-none lg:border-t lg:border-hairline lg:bg-transparent lg:px-0 lg:py-6 lg:backdrop-blur-none">
          {missing.length > 0 && (
            <p aria-live="polite" className="text-right text-xs text-ink-muted">
              Falta {missing.join(" y ")}.
            </p>
          )}
          <div className="flex justify-end">
            <Button size="lg" disabled={missing.length > 0} onClick={submit}>
              Continuar <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </AppPage>
  )
}

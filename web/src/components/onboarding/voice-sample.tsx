"use client"

import { Mic, PenLine, RotateCcw, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  AudioPlayerButton,
  AudioPlayerDuration,
  AudioPlayerProvider,
  AudioPlayerScrubber,
  AudioPlayerTime,
} from "@/components/audio/audio-player"
import { LiveWaveform } from "@/components/audio/live-waveform"
import { MicSelector } from "@/components/audio/mic-selector"
import { ShimmeringText } from "@/components/audio/shimmering-text"
import { formatDuration, useRecorder } from "@/components/audio/use-recorder"
import { useSpeechTranscript } from "@/components/audio/use-speech-transcript"
import { seededPeaks, useAudioPeaks, Waveform } from "@/components/audio/waveform"
import { StatusDot } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MAX_SECONDS = 120
const ON_DARK_SHIMMER =
  "bg-[linear-gradient(100deg,var(--color-on-dark-muted)_35%,var(--color-inverse)_50%,var(--color-on-dark-muted)_65%)] motion-reduce:text-on-dark-muted"

const IDLE_PEAKS = seededPeaks("tren-solar-voz", 96).map((peak) => peak * 0.55)

type Mode = "speak" | "write"

function VoiceSample({
  value,
  onChange,
  onBlur,
  onTranscript,
  minLength,
  required,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onTranscript: (text: string) => void
  minLength: number
  required: boolean
}) {
  const speech = useSpeechTranscript()
  const [mode, setMode] = useState<Mode>(speech.supported ? "speak" : "write")
  const [deviceId, setDeviceId] = useState<string>()
  const recorder = useRecorder({ deviceId })
  const { peaks } = useAudioPeaks(recorder.blob)
  const [touched, setTouched] = useState(false)
  const committedUrl = useRef<string | null>(null)

  const recording = recorder.status === "recording"
  const stopped = recorder.status === "stopped"
  const transcribing = stopped && speech.listening
  const { start: startSpeech, stop: stopSpeech } = speech

  useEffect(() => {
    if (recording) startSpeech()
    else stopSpeech()
  }, [recording, startSpeech, stopSpeech])

  useEffect(() => {
    if (recording && recorder.elapsed >= MAX_SECONDS) recorder.stop()
  }, [recording, recorder])

  useEffect(() => {
    if (!stopped || speech.listening || !recorder.url) return
    if (committedUrl.current === recorder.url) return
    committedUrl.current = recorder.url
    if (!speech.transcript) return
    onChange(speech.transcript)
    onTranscript(speech.transcript)
  }, [stopped, speech.listening, speech.transcript, recorder.url, onChange, onTranscript])

  function discard() {
    recorder.reset()
    speech.reset()
    committedUrl.current = null
    onChange("")
  }

  const length = value.trim().length
  const tooShort = length < minLength
  const showError = touched && required && tooShort && length > 0
  const heardNothing = stopped && !speech.listening && !speech.transcript && !speech.error
  const error = recorder.error?.message ?? speech.error
  const showText = mode === "write" || stopped || length > 0

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={mode}
          onValueChange={(next) => {
            if (recording) recorder.stop()
            setMode((next as Mode) ?? "speak")
          }}
          aria-label="Cómo querés contarlo"
        >
          <SegmentedControlItem value="speak" disabled={!speech.supported}>
            <Mic aria-hidden />
            Hablar
          </SegmentedControlItem>
          <SegmentedControlItem value="write">
            <PenLine aria-hidden />
            Escribir
          </SegmentedControlItem>
        </SegmentedControl>
        {!speech.supported && (
          <p className="text-xs text-ink-muted">
            Tu navegador no transcribe voz. Probá en Chrome o Safari, o escribilo.
          </p>
        )}
      </div>

      {mode === "speak" && (
        <section
          aria-label="Grabar tu voz"
          className="overflow-hidden rounded-[22px] bg-night text-inverse shadow-raised"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
            <MicSelector
              value={deviceId}
              onValueChange={setDeviceId}
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
              {formatDuration(recorder.elapsed)}
              {recording && <span className="text-white/70">/ {formatDuration(MAX_SECONDS)}</span>}
            </span>
          </div>

          <div className="flex min-h-[176px] flex-col justify-center gap-5 px-4 py-6 sm:px-5">
            {stopped && recorder.url ? (
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
            ) : !recording ? (
              <Waveform
                aria-hidden
                data={IDLE_PEAKS}
                height={56}
                barWidth={3}
                barGap={2}
                className="text-slate-hover"
              />
            ) : (
              <LiveWaveform
                active
                stream={recorder.stream}
                mode="scrolling"
                height={56}
                barWidth={3}
                barGap={2}
                sensitivity={1.6}
                className="text-accent"
              />
            )}

            <p
              aria-live="polite"
              className="min-h-[3.25rem] font-display text-[17px] leading-relaxed text-on-dark italic"
            >
              {recording ? (
                speech.transcript || speech.interim ? (
                  <>
                    <span className="text-inverse">{speech.transcript}</span>{" "}
                    {speech.interim && (
                      <ShimmeringText className={ON_DARK_SHIMMER}>{speech.interim}</ShimmeringText>
                    )}
                  </>
                ) : (
                  <ShimmeringText className={ON_DARK_SHIMMER}>Te escuchamos…</ShimmeringText>
                )
              ) : transcribing ? (
                <ShimmeringText className={ON_DARK_SHIMMER}>Transcribiendo…</ShimmeringText>
              ) : heardNothing ? (
                "No llegamos a entender nada. Probá de nuevo más cerca del micrófono, o escribilo."
              ) : stopped ? (
                "Listo. Revisá abajo lo que entendimos."
              ) : (
                "“Contá algo como se lo contarías a alguien. Por ejemplo, cómo ganaste algo en una hackathon.”"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
            {recording ? (
              <Button variant="outline" onClick={recorder.stop}>
                <Square aria-hidden className="fill-current" />
                Terminar
              </Button>
            ) : (
              <Button
                onClick={() => recorder.start()}
                disabled={recorder.status === "requesting" || transcribing}
              >
                <Mic aria-hidden />
                {stopped ? "Grabar de nuevo" : "Empezar a grabar"}
              </Button>
            )}
            {stopped && (
              <Button
                variant="ghost"
                className="text-on-dark hover:bg-white/10 hover:text-inverse"
                onClick={discard}
              >
                <RotateCcw aria-hidden />
                Descartar
              </Button>
            )}
            <p className="ml-auto text-xs text-on-dark-muted">
              {error ? (
                <span role="alert" className="text-accent-soft">
                  {error}
                </span>
              ) : (
                "No guardamos el audio, solo el texto."
              )}
            </p>
          </div>
        </section>
      )}

      {showText && (
        <Field invalid={showError}>
          <FieldLabel>{mode === "speak" ? "Lo que entendimos" : "Contalo con tus palabras"}</FieldLabel>
          <Textarea
            name="writing_sample"
            value={value}
            rows={mode === "speak" ? 4 : 6}
            placeholder="Ej: gané una hackathon armando una app en 24 horas con gente que recién conocía…"
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              setTouched(true)
              onBlur()
            }}
          />
          <div className="flex items-start justify-between gap-4">
            {showError ? (
              <FieldError>
                Escribí al menos {minLength} caracteres para que podamos imitar tu tono.
              </FieldError>
            ) : (
              <FieldDescription>
                {mode === "speak"
                  ? "Corregí lo que haga falta. No te preocupes por la ortografía ni la puntuación: nosotros lo acomodamos."
                  : "Escribí como te salga. No te preocupes por la ortografía ni la puntuación: nosotros lo acomodamos."}
              </FieldDescription>
            )}
            {required && tooShort && (
              <span className="shrink-0 pt-px text-xs text-ink-muted tabular-nums">
                {length}/{minLength}
              </span>
            )}
          </div>
        </Field>
      )}
    </div>
  )
}

export { VoiceSample }

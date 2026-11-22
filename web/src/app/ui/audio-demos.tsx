"use client"

import { Mic, RotateCcw, Square } from "lucide-react"
import { useEffect, useState } from "react"
import {
  AudioPlayerButton,
  AudioPlayerDuration,
  AudioPlayerProgress,
  AudioPlayerProvider,
  AudioPlayerScrubber,
  AudioPlayerSpeed,
  AudioPlayerTime,
} from "@/components/audio/audio-player"
import { LiveWaveform } from "@/components/audio/live-waveform"
import { MicSelector } from "@/components/audio/mic-selector"
import { ShimmeringText } from "@/components/audio/shimmering-text"
import { formatDuration, useRecorder } from "@/components/audio/use-recorder"
import { VoiceButton, type VoiceButtonState } from "@/components/audio/voice-button"
import { seededPeaks, useAudioPeaks } from "@/components/audio/waveform"
import { Badge, StatusDot } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"

const DEMO_SRC = "/audio/demo-logro.m4a"
const DEMO_TRANSCRIPT =
  "“Eh, bueno, la semana pasada terminamos la migración del front a Next 16. Y nada, el arranque quedó como tres veces más rápido, eso estuvo bueno. Lo coordiné con el equipo de diseño.”"

function RecorderDemo() {
  const [deviceId, setDeviceId] = useState<string>()
  const recorder = useRecorder({ deviceId })
  const { peaks } = useAudioPeaks(recorder.blob)
  const [transcribing, setTranscribing] = useState(false)
  const recording = recorder.status === "recording"

  useEffect(() => {
    if (recorder.status !== "stopped") return
    const timeout = setTimeout(() => setTranscribing(false), 2600)
    return () => clearTimeout(timeout)
  }, [recorder.status])

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <MicSelector value={deviceId} onValueChange={setDeviceId} disabled={recording} className="-ml-2" />
        <Badge variant={recording ? "danger" : "neutral"} className="tabular-nums">
          {recording && <StatusDot className="animate-pulse motion-reduce:animate-none" />}
          {formatDuration(recorder.elapsed)}
        </Badge>
      </div>

      <div className="px-5 py-6">
        {recorder.status === "stopped" && recorder.url ? (
          <AudioPlayerProvider src={recorder.url} duration={recorder.elapsed}>
            <div className="flex items-center gap-4">
              <AudioPlayerButton variant="primary" size="lg" className="size-12 shrink-0 px-0" />
              <div className="min-w-0 flex-1">
                <AudioPlayerScrubber peaks={peaks ?? seededPeaks("grabacion")} height={48} />
                <div className="mt-1.5 flex justify-between">
                  <AudioPlayerTime />
                  <AudioPlayerDuration />
                </div>
              </div>
            </div>
          </AudioPlayerProvider>
        ) : (
          <LiveWaveform
            active={recording}
            stream={recorder.stream}
            mode="scrolling"
            height={72}
            barWidth={3}
            barGap={2}
            sensitivity={1.6}
            className={recording ? "text-accent" : "text-ink-faint"}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-cream/60 px-5 py-4 shadow-[inset_0_1px_0_var(--color-divider)]">
        {recording ? (
          <Button variant="dark" onClick={() => (setTranscribing(true), recorder.stop())}>
            <Square className="fill-current" /> Detener
          </Button>
        ) : (
          <Button
            variant={recorder.status === "stopped" ? "secondary" : "primary"}
            onClick={() => void recorder.start()}
            disabled={recorder.status === "requesting"}
          >
            <Mic /> {recorder.status === "stopped" ? "Grabar de nuevo" : "Grabar logro"}
          </Button>
        )}
        {recorder.status === "stopped" && (
          <Button variant="ghost" onClick={recorder.reset}>
            <RotateCcw /> Descartar
          </Button>
        )}
        <p className="ml-auto min-w-0 text-[13px] text-ink-muted" aria-live="polite">
          {recorder.error ? (
            <span className="text-danger">{recorder.error.message}</span>
          ) : transcribing ? (
            <ShimmeringText>Transcribiendo tu audio…</ShimmeringText>
          ) : recording ? (
            "Contá qué hiciste, con quién y qué resultado tuvo."
          ) : recorder.status === "stopped" ? (
            "Listo. Escuchalo antes de seguir."
          ) : (
            "Se graba solo en tu navegador."
          )}
        </p>
      </div>
    </Card>
  )
}

function PlayerDemo() {
  const { peaks } = useAudioPeaks(DEMO_SRC)
  return (
    <AudioPlayerProvider src={DEMO_SRC}>
      <Card variant="dark">
        <CardHeader className="flex-row items-center justify-between">
          <CardDescription className="text-[11px] font-semibold tracking-[0.08em] uppercase">Tu audio · 22 nov</CardDescription>
          <AudioPlayerSpeed className="-mr-2 text-on-dark hover:bg-white/10 hover:text-inverse" />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <AudioPlayerButton variant="primary" size="lg" className="size-12 shrink-0 px-0" />
            <div className="min-w-0 flex-1">
              <AudioPlayerScrubber peaks={peaks ?? seededPeaks(DEMO_SRC)} height={44} tone="dark" />
              <div className="mt-1.5 flex justify-between">
                <AudioPlayerTime className="text-on-dark-muted" />
                <AudioPlayerDuration className="text-on-dark-muted" />
              </div>
            </div>
          </div>
          <p className="font-display text-[15px] leading-relaxed text-on-dark italic">{DEMO_TRANSCRIPT}</p>
        </CardContent>
      </Card>
    </AudioPlayerProvider>
  )
}

function CompactPlayerDemo() {
  return (
    <AudioPlayerProvider src={DEMO_SRC}>
      <div className="flex items-center gap-3 rounded-full bg-paper py-1.5 pr-4 pl-1.5 shadow-raised">
        <AudioPlayerButton size="icon-sm" />
        <AudioPlayerTime className="w-9 text-xs" />
        <AudioPlayerProgress className="flex-1" />
        <AudioPlayerDuration className="w-9 text-right text-xs" />
      </div>
    </AudioPlayerProvider>
  )
}

function VoiceButtonDemo() {
  const [state, setState] = useState<VoiceButtonState>("idle")
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl value={state} onValueChange={(value) => setState((value as VoiceButtonState) ?? "idle")} aria-label="Estado">
        <SegmentedControlItem value="idle">Idle</SegmentedControlItem>
        <SegmentedControlItem value="processing">Procesando</SegmentedControlItem>
        <SegmentedControlItem value="success">Éxito</SegmentedControlItem>
        <SegmentedControlItem value="error">Error</SegmentedControlItem>
      </SegmentedControl>
      <div className="flex flex-wrap items-center gap-3">
        <VoiceButton state={state} label="Dictar" trailing="⌥ D" />
        <VoiceButton state={state} label="Responder" variant="secondary" />
        <VoiceButton state={state} size="icon" variant="secondary" />
      </div>
    </div>
  )
}

export { RecorderDemo, PlayerDemo, CompactPlayerDemo, VoiceButtonDemo }

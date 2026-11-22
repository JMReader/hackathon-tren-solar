"use client"

import { Gauge, Pause, Play } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react"
import { Button } from "@/components/ui/button"
import { Menu, MenuContent, MenuGroupLabel, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu"
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { AudioScrubber } from "./audio-scrubber"
import { formatDuration } from "./use-recorder"

type AudioPlayerApi = {
  ref: RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  isBuffering: boolean
  duration: number | undefined
  playbackRate: number
  error: MediaError | null
  play: () => Promise<void>
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null)
const AudioPlayerTimeContext = createContext<number | null>(null)

function useAudioPlayer() {
  const api = useContext(AudioPlayerContext)
  if (!api) throw new Error("useAudioPlayer debe usarse dentro de <AudioPlayerProvider>")
  return api
}

function useAudioPlayerTime() {
  const time = useContext(AudioPlayerTimeContext)
  if (time === null) throw new Error("useAudioPlayerTime debe usarse dentro de <AudioPlayerProvider>")
  return time
}

function AudioPlayerProvider({ src, duration: knownDuration, children }: { src?: string | null; duration?: number; children: ReactNode }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [mediaDuration, setMediaDuration] = useState<number>()
  const [playbackRate, setRate] = useState(1)
  const [error, setError] = useState<MediaError | null>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    let probing = false
    const sync = () => setTime(audio.currentTime)
    const readDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setMediaDuration(audio.duration)
        if (probing) {
          probing = false
          audio.currentTime = 0
        }
      } else if (audio.duration === Infinity && !probing) {
        // MediaRecorder webm files report Infinity until the end is read; seeking far forces the real value.
        probing = true
        audio.currentTime = 1e101
      }
    }
    const handlers: [keyof HTMLMediaElementEventMap, () => void][] = [
      ["play", () => setIsPlaying(true)],
      ["pause", () => setIsPlaying(false)],
      ["ended", () => (setIsPlaying(false), sync())],
      ["waiting", () => setIsBuffering(true)],
      ["playing", () => setIsBuffering(false)],
      ["canplay", () => setIsBuffering(false)],
      ["loadedmetadata", readDuration],
      ["durationchange", readDuration],
      ["timeupdate", () => (probing ? readDuration() : sync())],
      ["seeked", sync],
      ["ratechange", () => setRate(audio.playbackRate)],
      ["error", () => setError(audio.error)],
      ["emptied", () => (setMediaDuration(undefined), setTime(0), setError(null))],
    ]
    handlers.forEach(([event, handler]) => audio.addEventListener(event, handler))
    // Metadata can load during hydration, before these listeners exist.
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) queueMicrotask(readDuration)
    return () => handlers.forEach(([event, handler]) => audio.removeEventListener(event, handler))
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    const tick = () => {
      if (ref.current) setTime(ref.current.currentTime)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying])

  const play = useCallback(async () => {
    try {
      await ref.current?.play()
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") throw err
    }
  }, [])
  const pause = useCallback(() => ref.current?.pause(), [])
  const toggle = useCallback(() => (ref.current?.paused ? void play() : pause()), [play, pause])
  const seek = useCallback((value: number) => {
    if (!ref.current) return
    ref.current.currentTime = value
    setTime(value)
  }, [])
  const setPlaybackRate = useCallback((rate: number) => {
    if (ref.current) ref.current.playbackRate = rate
  }, [])

  const duration = mediaDuration ?? (knownDuration && Number.isFinite(knownDuration) ? knownDuration : undefined)

  const api = useMemo<AudioPlayerApi>(
    () => ({ ref, isPlaying, isBuffering, duration, playbackRate, error, play, pause, toggle, seek, setPlaybackRate }),
    [isPlaying, isBuffering, duration, playbackRate, error, play, pause, toggle, seek, setPlaybackRate],
  )

  return (
    <AudioPlayerContext.Provider value={api}>
      <AudioPlayerTimeContext.Provider value={time}>
        <audio ref={ref} src={src ?? undefined} preload="metadata" className="hidden" />
        {children}
      </AudioPlayerTimeContext.Provider>
    </AudioPlayerContext.Provider>
  )
}

function AudioPlayerButton({
  variant = "dark",
  size = "icon",
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const player = useAudioPlayer()
  const loading = player.isBuffering && player.isPlaying
  const icon = "col-start-1 row-start-1 transition-[opacity,scale,filter] duration-200 ease-out"
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={player.isPlaying ? "Pausar" : "Reproducir"}
      onClick={player.toggle}
      disabled={!!player.error}
      className={className}
      {...props}
    >
      <span className="inline-grid place-items-center">
        <Play aria-hidden className={cn(icon, "translate-x-px fill-current", (player.isPlaying || loading) && "scale-50 opacity-0 blur-[2px]")} />
        <Pause aria-hidden className={cn(icon, "fill-current", (!player.isPlaying || loading) && "scale-50 opacity-0 blur-[2px]")} />
        <Spinner className={cn(icon, !loading && "opacity-0")} />
      </span>
    </Button>
  )
}

function AudioPlayerProgress({ className, ...props }: Omit<ComponentProps<typeof Slider>, "value" | "max" | "onValueChange" | "children">) {
  const player = useAudioPlayer()
  const time = useAudioPlayerTime()
  const resumeRef = useRef(false)
  return (
    <Slider
      value={Math.min(time, player.duration ?? 0)}
      min={0}
      max={player.duration ?? 0}
      step={0.1}
      disabled={!player.duration}
      onValueChange={(value, details) => {
        if (details.reason !== "imperative" && player.isPlaying && !resumeRef.current) {
          resumeRef.current = true
          player.pause()
        }
        player.seek(value as number)
      }}
      onValueCommit={() => {
        if (resumeRef.current) void player.play()
        resumeRef.current = false
      }}
      className={className}
      {...props}
    >
      <SliderControl>
        <SliderTrack className="h-1">
          <SliderIndicator />
          <SliderThumb aria-label="Posición del audio" className="size-3.5" />
        </SliderTrack>
      </SliderControl>
    </Slider>
  )
}

function AudioPlayerScrubber({ peaks, ...props }: Omit<ComponentProps<typeof AudioScrubber>, "currentTime" | "duration" | "onSeek">) {
  const player = useAudioPlayer()
  const time = useAudioPlayerTime()
  return <AudioScrubber peaks={peaks} currentTime={time} duration={player.duration ?? 0} onSeek={player.seek} {...props} />
}

function AudioPlayerTime({ className, ...props }: ComponentProps<"span">) {
  const time = useAudioPlayerTime()
  return (
    <span className={cn("text-[13px] text-ink-muted tabular-nums", className)} {...props}>
      {formatDuration(time)}
    </span>
  )
}

function AudioPlayerDuration({ className, ...props }: ComponentProps<"span">) {
  const { duration } = useAudioPlayer()
  return (
    <span className={cn("text-[13px] text-ink-muted tabular-nums", className)} {...props}>
      {duration ? formatDuration(Math.round(duration)) : "–:––"}
    </span>
  )
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

function AudioPlayerSpeed({ speeds = SPEEDS, className }: { speeds?: readonly number[]; className?: string }) {
  const player = useAudioPlayer()
  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="ghost" size="sm" />}
        aria-label={`Velocidad: ${player.playbackRate}×`}
        className={cn("min-w-14 px-2.5 tabular-nums", className)}
      >
        <Gauge aria-hidden />
        {player.playbackRate}×
      </MenuTrigger>
      <MenuContent className="min-w-36">
        <MenuRadioGroup value={String(player.playbackRate)} onValueChange={(value) => player.setPlaybackRate(Number(value))}>
          <MenuGroupLabel>Velocidad</MenuGroupLabel>
          {speeds.map((speed) => (
            <MenuRadioItem key={speed} value={String(speed)} className="tabular-nums">
              {speed === 1 ? "Normal" : `${speed}×`}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

export {
  AudioPlayerProvider,
  AudioPlayerButton,
  AudioPlayerProgress,
  AudioPlayerScrubber,
  AudioPlayerTime,
  AudioPlayerDuration,
  AudioPlayerSpeed,
  useAudioPlayer,
  useAudioPlayerTime,
}

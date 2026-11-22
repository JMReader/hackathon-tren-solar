"use client"

import { Check, Mic, X } from "lucide-react"
import { useEffect, useState, type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LiveWaveform } from "./live-waveform"

type VoiceButtonState = "idle" | "recording" | "processing" | "success" | "error"

type VoiceButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  state?: VoiceButtonState
  label?: ReactNode
  trailing?: ReactNode
  stream?: MediaStream | null
  feedbackDuration?: number
}

function VoiceButton({
  state = "idle",
  label,
  trailing,
  stream,
  variant = "outline",
  size = "md",
  feedbackDuration = 1500,
  disabled,
  className,
  ...props
}: VoiceButtonProps) {
  const [expired, setExpired] = useState<VoiceButtonState | null>(null)
  const [previous, setPrevious] = useState(state)
  if (state !== previous) {
    setPrevious(state)
    setExpired(null)
  }

  useEffect(() => {
    if (state !== "success" && state !== "error") return
    const timeout = setTimeout(() => setExpired(state), feedbackDuration)
    return () => clearTimeout(timeout)
  }, [state, feedbackDuration])

  const feedback = (state === "success" || state === "error") && expired !== state ? state : null

  const recording = state === "recording"
  const processing = state === "processing"
  const iconOnly = size === "icon" || size === "icon-sm"
  const showWave = recording || processing || feedback !== null
  const layer = "absolute inset-0 flex items-center justify-center transition-[opacity,filter] duration-200 ease-out"

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || processing}
      aria-pressed={recording}
      aria-busy={processing || undefined}
      aria-label={iconOnly ? (recording ? "Detener grabación" : "Grabar") : undefined}
      className={cn(!iconOnly && "pr-1.5", processing && "data-disabled:cursor-progress data-disabled:opacity-100", recording && variant === "outline" && "shadow-[0_0_0_1px_rgb(204_70_0/0.35)]", className)}
      {...props}
    >
      {!iconOnly && label}
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full transition-[background-color,color] duration-200 ease-out",
          iconOnly ? "absolute inset-0" : "h-7 w-20",
          recording ? "bg-accent-soft text-accent-strong" : iconOnly ? "" : "bg-sunken text-ink-muted",
        )}
      >
        {showWave && (
          <LiveWaveform
            active={recording}
            processing={processing || feedback === "success"}
            stream={stream}
            barWidth={2}
            barGap={1.5}
            barRadius={2}
            fadeEdges={false}
            sensitivity={1.8}
            smoothingTimeConstant={0.85}
            height={iconOnly ? 18 : 20}
            mode="static"
            className="absolute inset-x-2 top-1/2 w-auto -translate-y-1/2 text-current"
          />
        )}
        <span className={cn(layer, showWave && "opacity-0 blur-[2px]")}>
          {iconOnly ? <Mic aria-hidden /> : typeof trailing === "string" ? <kbd className="font-mono text-[11px] font-medium">{trailing}</kbd> : trailing}
        </span>
        <span className={cn(layer, "bg-paper/85 text-[#2f7d4f]", feedback !== "success" && "opacity-0 blur-[2px]")}>
          <Check aria-hidden strokeWidth={2.5} className="!size-3.5" />
        </span>
        <span className={cn(layer, "bg-paper/85 text-danger", feedback !== "error" && "opacity-0 blur-[2px]")}>
          <X aria-hidden strokeWidth={2.5} className="!size-3.5" />
        </span>
      </span>
    </Button>
  )
}

export { VoiceButton, type VoiceButtonState }

"use client"

import type { ComponentProps } from "react"
import { Slider, SliderControl, SliderThumb, SliderTrack } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { formatDuration } from "./use-recorder"
import { Waveform } from "./waveform"

type AudioScrubberProps = Omit<ComponentProps<typeof Slider>, "value" | "max" | "onValueChange" | "children"> & {
  peaks: number[]
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
  height?: number
  tone?: "light" | "dark"
}

function AudioScrubber({ peaks, currentTime, duration, onSeek, height = 56, tone = "light", className, ...props }: AudioScrubberProps) {
  const dark = tone === "dark"
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  return (
    <Slider
      value={Math.min(currentTime, duration)}
      min={0}
      max={duration}
      step={0.1}
      disabled={!duration}
      onValueChange={(value) => onSeek?.(value as number)}
      format={(value) => formatDuration(value)}
      className={cn("group/scrubber", className)}
      {...props}
    >
      <SliderControl style={{ height }} className="relative h-auto">
        <SliderTrack className="h-full rounded-none bg-transparent">
          <Waveform data={peaks} height="100%" className={cn("absolute inset-0", dark ? "text-white/20" : "text-ink/20")} />
          <Waveform
            data={peaks}
            height="100%"
            className={cn("absolute inset-0", dark ? "text-inverse" : "text-ink")}
            style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
          />
          <SliderThumb
            aria-label="Posición del audio"
            className={cn(
              "h-full w-0.5 rounded-full shadow-none ring-0 before:absolute before:-top-1 before:left-1/2 before:size-2.5 before:-translate-x-1/2 before:rounded-full group-data-dragging/slider:scale-100 has-[:focus-visible]:outline-offset-4",
              dark ? "bg-accent before:bg-accent" : "bg-accent-strong before:bg-accent-strong",
            )}
          />
        </SliderTrack>
      </SliderControl>
    </Slider>
  )
}

export { AudioScrubber, type AudioScrubberProps }

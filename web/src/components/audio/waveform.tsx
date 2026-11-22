"use client"

import { useEffect, useRef, useState, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type WaveformProps = HTMLAttributes<HTMLDivElement> & {
  data: number[]
  barWidth?: number
  barGap?: number
  barRadius?: number
  minBarHeight?: number
  height?: number | string
}

function Waveform({
  data,
  barWidth = 3,
  barGap = 2,
  barRadius = 1.5,
  minBarHeight = 3,
  height = 64,
  className,
  style,
  ...props
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const draw = () => {
      const { width, height: boxHeight } = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(boxHeight * dpr)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, boxHeight)
      ctx.fillStyle = getComputedStyle(canvas).color
      const step = barWidth + barGap
      const count = Math.floor((width + barGap) / step)
      const centerY = boxHeight / 2
      for (let i = 0; i < count; i++) {
        const value = data.length ? data[Math.floor((i / count) * data.length)] ?? 0 : 0
        const barHeight = Math.max(minBarHeight, value * boxHeight)
        ctx.beginPath()
        ctx.roundRect(i * step, centerY - barHeight / 2, barWidth, barHeight, barRadius)
        ctx.fill()
      }
    }

    const observer = new ResizeObserver(draw)
    observer.observe(container)
    return () => observer.disconnect()
  }, [data, barWidth, barGap, barRadius, minBarHeight])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ height: typeof height === "number" ? `${height}px` : height, ...style }}
      {...props}
    >
      <canvas ref={canvasRef} aria-hidden className="block size-full" />
    </div>
  )
}

function seededPeaks(seed: string, count = 96) {
  let h = 2166136261
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  return Array.from({ length: count }, (_, i) => {
    const envelope = 0.55 + 0.45 * Math.sin((i / count) * Math.PI)
    return Math.min(1, (0.18 + next() * 0.7) * envelope)
  })
}

async function decodePeaks(source: Blob | string, count: number) {
  const buffer = typeof source === "string" ? await (await fetch(source)).arrayBuffer() : await source.arrayBuffer()
  const context = new AudioContext()
  try {
    const audio = await context.decodeAudioData(buffer)
    const channel = audio.getChannelData(0)
    const bucket = Math.max(1, Math.floor(channel.length / count))
    const peaks = Array.from({ length: count }, (_, i) => {
      let max = 0
      for (let j = i * bucket, end = Math.min(channel.length, j + bucket); j < end; j++) {
        const value = Math.abs(channel[j])
        if (value > max) max = value
      }
      return max
    })
    const loudest = Math.max(...peaks, 0.01)
    return { peaks: peaks.map((p) => Math.pow(p / loudest, 0.8)), duration: audio.duration }
  } finally {
    void context.close()
  }
}

type PeaksResult = { source: Blob | string; peaks: number[] | null; duration: number | null; error: Error | null }

function useAudioPeaks(source: Blob | string | null | undefined, count = 120) {
  const [result, setResult] = useState<PeaksResult | null>(null)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    decodePeaks(source, count)
      .then(({ peaks, duration }) => !cancelled && setResult({ source, peaks, duration, error: null }))
      .catch((error: Error) => !cancelled && setResult({ source, peaks: null, duration: null, error }))
    return () => {
      cancelled = true
    }
  }, [source, count])

  const current = source && result?.source === source ? result : null
  return {
    peaks: current?.peaks ?? null,
    duration: current?.duration ?? null,
    error: current?.error ?? null,
    loading: !!source && !current,
  }
}

export { Waveform, seededPeaks, useAudioPeaks, type WaveformProps }

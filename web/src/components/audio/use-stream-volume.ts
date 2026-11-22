"use client"

import { useCallback, useEffect, useRef } from "react"

function useStreamVolume(stream: MediaStream | null | undefined, sensitivity = 2.5) {
  const analyserRef = useRef<AnalyserNode | null>(null)
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return
    const context = new AudioContext()
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.6
    context.createMediaStreamSource(stream).connect(analyser)
    analyserRef.current = analyser
    bufferRef.current = new Float32Array(analyser.fftSize)
    return () => {
      analyserRef.current = null
      bufferRef.current = null
      void context.close()
    }
  }, [stream])

  return useCallback(() => {
    const analyser = analyserRef.current
    const buffer = bufferRef.current
    if (!analyser || !buffer) return 0
    analyser.getFloatTimeDomainData(buffer)
    let sum = 0
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
    return Math.min(1, Math.sqrt(sum / buffer.length) * sensitivity)
  }, [sensitivity])
}

export { useStreamVolume }

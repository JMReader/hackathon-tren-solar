"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "error"

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

function describeError(error: unknown) {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return new Error("Necesitamos permiso para usar el micrófono. Habilitalo en el navegador y probá de nuevo.")
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return new Error("No encontramos un micrófono conectado.")
  }
  return error instanceof Error ? error : new Error("No se pudo iniciar la grabación.")
}

function useRecorder({ deviceId }: { deviceId?: string } = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const urlRef = useRef<string | null>(null)

  const releaseStream = useCallback((current: MediaStream | null) => {
    current?.getTracks().forEach((track) => track.stop())
    setStream(null)
  }, [])

  const reset = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setBlob(null)
    setUrl(null)
    setElapsed(0)
    setError(null)
    setStatus("idle")
  }, [])

  const start = useCallback(async () => {
    if (recorderRef.current?.state === "recording") return
    reset()
    setStatus("requesting")
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(media, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        clearInterval(timerRef.current)
        const result = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" })
        const objectUrl = URL.createObjectURL(result)
        urlRef.current = objectUrl
        setBlob(result)
        setUrl(objectUrl)
        setElapsed((performance.now() - startedAtRef.current) / 1000)
        releaseStream(media)
        setStatus("stopped")
      }
      recorderRef.current = recorder
      setStream(media)
      recorder.start(250)
      startedAtRef.current = performance.now()
      timerRef.current = setInterval(() => setElapsed((performance.now() - startedAtRef.current) / 1000), 250)
      setStatus("recording")
    } catch (err) {
      setError(describeError(err))
      setStatus("error")
    }
  }, [deviceId, releaseStream, reset])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
  }, [])

  useEffect(
    () => () => {
      clearInterval(timerRef.current)
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  return { status, stream, blob, url, elapsed, error, start, stop, reset }
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, "0")
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`
}

export { useRecorder, formatDuration, type RecorderStatus }

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type RecognitionResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => Recognition

function getRecognition(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function describeError(code: string) {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "El navegador no nos dejó transcribir tu voz."
  if (code === "network") return "No pudimos transcribir: revisá tu conexión."
  if (code === "audio-capture") return "No encontramos un micrófono para transcribir."
  return "No pudimos transcribir tu voz."
}

function join(...parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(" ")
}

function useSpeechTranscript({ lang = "es-AR" }: { lang?: string } = {}) {
  const [supported] = useState(() => Boolean(getRecognition()))
  const [transcript, setTranscript] = useState("")
  const [interim, setInterim] = useState("")
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<Recognition | null>(null)
  const wantedRef = useRef(false)
  const committedRef = useRef("")

  const start = useCallback(() => {
    const Ctor = getRecognition()
    if (!Ctor) return
    recognitionRef.current?.abort()
    committedRef.current = ""
    setTranscript("")
    setInterim("")
    setError(null)

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    let sessionFinal = ""

    const active = () => recognitionRef.current === recognition

    recognition.onresult = (event) => {
      if (!active()) return
      let final = ""
      let pending = ""
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) final = join(final, result[0].transcript)
        else pending = join(pending, result[0].transcript)
      }
      sessionFinal = final
      setTranscript(join(committedRef.current, final))
      setInterim(pending)
    }
    recognition.onerror = (event) => {
      if (!active() || event.error === "no-speech" || event.error === "aborted") return
      wantedRef.current = false
      setError(describeError(event.error))
    }
    // Chrome ends continuous sessions after a pause; restart while the user is still recording.
    recognition.onend = () => {
      if (!active()) return
      committedRef.current = join(committedRef.current, sessionFinal)
      sessionFinal = ""
      setInterim("")
      if (wantedRef.current) {
        try {
          recognition.start()
          return
        } catch {
          wantedRef.current = false
        }
      }
      setListening(false)
    }

    recognitionRef.current = recognition
    wantedRef.current = true
    try {
      recognition.start()
      setListening(true)
    } catch {
      wantedRef.current = false
      setError(describeError("start"))
    }
  }, [lang])

  const stop = useCallback(() => {
    wantedRef.current = false
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    wantedRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    committedRef.current = ""
    setTranscript("")
    setInterim("")
    setError(null)
    setListening(false)
  }, [])

  useEffect(
    () => () => {
      wantedRef.current = false
      recognitionRef.current?.abort()
    },
    [],
  )

  return { supported, transcript, interim, listening, error, start, stop, reset }
}

export { useSpeechTranscript }

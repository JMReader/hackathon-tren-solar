"use client"

import { FileText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button, buttonStyles } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { FileInput, FileInputDropzone, FileInputTrigger } from "@/components/ui/file-input"
import { Spinner } from "@/components/ui/spinner"
import { useUploadCv } from "@/lib/api/hooks"
import { cn } from "@/lib/utils"

const MAX_FILE = 10 * 1024 * 1024

export function CvGate({ sessionId, embedded = false, onExample }: { sessionId: string; embedded?: boolean; onExample: () => void }) {
  const upload = useUploadCv(sessionId)
  const [error, setError] = useState<string>()

  return (
    <div className={cn("mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4", embedded ? "lg:pt-12" : "justify-center py-10 sm:py-14")}>
      {!embedded && <p className="font-display text-2xl tracking-display text-inverse">chambeAR</p>}
      <div className="rounded-[22px] bg-paper p-5 shadow-raised sm:p-8">
        <h1 className="font-display text-2xl tracking-display text-ink sm:text-4xl">Primero subí tu CV</h1>
        <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-muted">
          El portfolio se arma con tus logros y tu CV. El CV queda privado: quien abre tu link sólo lo puede bajar si vos lo permitís.
        </p>

        <Field invalid={Boolean(error)} className="mt-6">
          <FieldLabel>Tu CV</FieldLabel>
          <FileInput
            accept=".pdf,application/pdf"
            maxSize={MAX_FILE}
            onValueChange={(files) => {
              const file = files[0]
              if (!file) return
              setError(undefined)
              upload.mutate(file, { onError: () => setError("No pudimos subir el CV. Probá de nuevo.") })
            }}
            onReject={(rejected) => {
              const reasons = rejected[0]?.reasons ?? []
              setError(reasons.includes("file-too-large") ? "El CV no puede superar 10 MB." : "El CV tiene que ser un PDF.")
            }}
          >
            <FileInputDropzone className="flex-row justify-start gap-3 px-4 py-4 text-left">
              {upload.isPending ? <Spinner className="size-5 shrink-0 text-ink-muted" /> : <FileText aria-hidden className="size-5 shrink-0 text-ink-muted" />}
              <span className="flex min-w-0 flex-1 flex-col" aria-live="polite">
                <span className="text-sm font-medium text-ink">{upload.isPending ? "Subiendo tu CV…" : "Subí tu CV en PDF"}</span>
                <span className="text-xs text-ink-muted">Hasta 10 MB</span>
              </span>
              <FileInputTrigger disabled={upload.isPending}>Elegir PDF</FileInputTrigger>
            </FileInputDropzone>
          </FileInput>
          {error && <FieldError>{error}</FieldError>}
        </Field>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
          <Button variant="ghost" onClick={onExample}>
            Ver un portfolio de ejemplo
          </Button>
          {!embedded && (
            <Link href="/onboarding" className={buttonStyles({ variant: "ghost" })}>
              Volver al onboarding
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

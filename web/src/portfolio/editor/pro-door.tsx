"use client"

import { Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBackdrop, DialogContent, DialogDescription, DialogDismiss, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { toast } from "@/components/ui/toast"
import { registerProInterest } from "../actions"
import type { ProInterest } from "../types"

export type ProDoorRequest = { trigger: ProInterest["trigger"]; itemId: string | null; itemName: string | null }

export const proBenefits = [
  "Cinco plantillas más, pensadas para destacar",
  "Tus colores, tu tipografía y el orden que quieras",
  "Tu propio dominio en lugar del link de Tren Solar",
]

const priceBands: { value: NonNullable<ProInterest["price_band_ars_month"]>; label: string }[] = [
  { value: "none", label: "No pagaría" },
  { value: "up_to_2000", label: "Hasta $2.000" },
  { value: "2000_5000", label: "De $2.000 a $5.000" },
  { value: "5000_10000", label: "De $5.000 a $10.000" },
  { value: "over_10000", label: "Más de $10.000" },
]

export function ProDoor({ request, onClose }: { request: ProDoorRequest | null; onClose: () => void }) {
  const [priceBand, setPriceBand] = useState<ProInterest["price_band_ars_month"]>(null)

  const subject =
    request?.trigger === "customize"
      ? "cambiar colores, tipografía y el orden de las secciones"
      : request?.trigger === "domain"
        ? "poner tu portfolio en tu propio dominio, tipo tunombre.com"
        : `usar la plantilla ${request?.itemName ?? ""}`

  async function answer(response: ProInterest["response"]) {
    if (!request) return
    const result = await registerProInterest({ response, trigger: request.trigger, item_id: request.itemId, price_band_ars_month: priceBand }).catch(() => ({ ok: false as const }))
    onClose()
    setPriceBand(null)
    if (!result.ok) toast("No pudimos guardar tu respuesta", { description: "Probá de nuevo en un momento.", type: "error" })
    else if (response === "interested") toast("Anotamos tu interés", { description: "No te cobramos nada.", type: "success" })
  }

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogBackdrop />
      <DialogContent>
        <DialogDismiss />
        <DialogTitle>Todavía no hay versión Pro</DialogTitle>
        <DialogDescription>
          Queremos saber si vale la pena armarla. Con Pro podrías {subject}. Hoy no se cobra nada.
        </DialogDescription>

        <ul className="mt-4 flex flex-col gap-2 text-sm text-ink">
          {proBenefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
              {benefit}
            </li>
          ))}
        </ul>

        <fieldset className="mt-5 flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium text-ink">¿Cuánto pagarías por mes? Si no querés, no contestes.</legend>
          <RadioGroup value={priceBand} onValueChange={(next) => setPriceBand(next as ProInterest["price_band_ars_month"])}>
            {priceBands.map((band) => (
              <label key={band.value} className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                <Radio value={band.value} /> {band.label}
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => answer("not_now")}>
            No por ahora
          </Button>
          <Button size="sm" onClick={() => answer("interested")}>
            Me interesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

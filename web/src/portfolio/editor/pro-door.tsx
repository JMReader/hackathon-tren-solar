"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBackdrop, DialogContent, DialogDescription, DialogDismiss, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { toast } from "@/components/ui/toast"
import type { ProInterest } from "../types"

export type ProDoorRequest = { trigger: ProInterest["trigger"]; itemId: string | null; itemName: string | null }

const priceBands: { value: NonNullable<ProInterest["price_band_ars_month"]>; label: string }[] = [
  { value: "none", label: "No pagaría" },
  { value: "up_to_2000", label: "Hasta $2.000" },
  { value: "2000_5000", label: "De $2.000 a $5.000" },
  { value: "5000_10000", label: "De $5.000 a $10.000" },
  { value: "over_10000", label: "Más de $10.000" },
]

async function sendInterest(body: ProInterest) {
  const response = await fetch("/api/v1/pro-interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`pro-interest ${response.status}`)
}

export function ProDoor({ request, onClose }: { request: ProDoorRequest | null; onClose: () => void }) {
  const [priceBand, setPriceBand] = useState<ProInterest["price_band_ars_month"]>(null)

  const subject =
    request?.trigger === "customize"
      ? "elegir tus propios colores y tipografía"
      : `usar la plantilla ${request?.itemName ?? ""}`

  async function answer(response: ProInterest["response"]) {
    if (!request) return
    try {
      await sendInterest({ response, trigger: request.trigger, item_id: request.itemId, price_band_ars_month: priceBand })
      if (response === "interested") toast("Anotamos tu interés", { description: "No te cobramos nada.", type: "success" })
      onClose()
      setPriceBand(null)
    } catch {
      toast("No pudimos guardar tu respuesta", { description: "Probá de nuevo en un momento.", type: "error" })
    }
  }

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogBackdrop />
      <DialogContent>
        <DialogDismiss />
        <DialogTitle>Pro todavía no existe</DialogTitle>
        <DialogDescription>
          Estamos viendo si sumar una versión paga para {subject}. Si te interesa, contanos y lo tenemos en cuenta.
        </DialogDescription>

        <fieldset className="mt-5 flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium text-ink">¿Cuánto pagarías por mes? (opcional)</legend>
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

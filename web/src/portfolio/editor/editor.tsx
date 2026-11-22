"use client"

import { ExternalLink, Lock, Monitor, Palette as PaletteIcon, Smartphone } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Switch } from "@/components/ui/switch"
import { Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { findPalette, findTemplate, palettes, templates } from "../catalog"
import { PortfolioView } from "../templates"
import { paletteStyle } from "../theme"
import type { PublicPortfolio } from "../types"
import { ProDoor, type ProDoorRequest } from "./pro-door"
import { TemplateThumbnail } from "./thumbnails"

type Device = "mobile" | "desktop"

export function PortfolioEditor({ portfolio }: { portfolio: PublicPortfolio }) {
  const [templateId, setTemplateId] = useState(portfolio.template_id)
  const [paletteId, setPaletteId] = useState(portfolio.palette.id)
  const [cvDownloadable, setCvDownloadable] = useState(false)
  const [device, setDevice] = useState<Device>("mobile")
  const [proDoor, setProDoor] = useState<ProDoorRequest | null>(null)

  const palette = findPalette(paletteId) ?? portfolio.palette
  const preview: PublicPortfolio = {
    ...portfolio,
    template_id: templateId,
    palette,
    cv_url: cvDownloadable ? "#cv" : null,
  }
  const publicHref = `/p/${portfolio.slug}?plantilla=${templateId}&paleta=${paletteId}`

  return (
    <div className="flex min-h-dvh flex-col bg-night lg:h-dvh lg:flex-row">
      <aside className="flex flex-col bg-cream lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto">
        <header className="flex items-start justify-between gap-3 px-6 pt-6">
          <div>
            <h1 className="font-display text-[28px] leading-tight font-normal tracking-display text-ink">Tu portfolio</h1>
            <p className="mt-1 text-sm text-ink-muted">Elegí cómo se ve. Los hechos son los que ya aprobaste.</p>
          </div>
          <Badge variant="neutral">Datos de ejemplo</Badge>
        </header>

        <section aria-labelledby="pf-template" className="px-6 pt-8">
          <h2 id="pf-template" className="text-sm font-semibold text-ink">Plantilla</h2>
          <RadioGroup
            aria-labelledby="pf-template"
            value={templateId}
            onValueChange={(next, details) => {
              const template = next ? findTemplate(next) : undefined
              if (!template) return
              if (template.tier === "pro") {
                details.cancel()
                setProDoor({ trigger: "template", itemId: template.id, itemName: template.name })
                return
              }
              setTemplateId(template.id)
            }}
            className="mt-3 grid grid-cols-2 gap-2.5"
          >
            {templates.map((template) => (
              <label
                key={template.id}
                style={paletteStyle(palette)}
                className="group/card pressable relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-paper shadow-raised has-data-checked:ring-2 has-data-checked:ring-ink has-focus-visible:ring-2 has-focus-visible:ring-accent-strong"
              >
                <TemplateThumbnail templateId={template.id} className={cn("aspect-[4/3]", template.tier === "pro" && "opacity-70")} />
                <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-ink">{template.name}</span>
                  {template.tier === "pro" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                      <Lock aria-hidden className="size-3" /> Pro
                    </span>
                  )}
                </span>
                <Radio value={template.id} aria-label={`${template.name}${template.tier === "pro" ? ", Pro" : ""}. ${template.description}`} className="sr-only" />
              </label>
            ))}
          </RadioGroup>
          <p className="mt-3 text-[13px] leading-snug text-ink-muted">{findTemplate(templateId)?.description}</p>
        </section>

        <section aria-labelledby="pf-palette" className="px-6 pt-8">
          <h2 id="pf-palette" className="text-sm font-semibold text-ink">Colores</h2>
          <RadioGroup aria-labelledby="pf-palette" value={paletteId} onValueChange={(next) => next && setPaletteId(next)} className="mt-3 grid grid-cols-2 gap-2">
            {palettes.map((option) => (
              <label
                key={option.id}
                className="pressable flex cursor-pointer items-center gap-3 rounded-xl bg-paper px-3 py-2.5 shadow-raised has-data-checked:ring-2 has-data-checked:ring-ink has-focus-visible:ring-2 has-focus-visible:ring-accent-strong"
              >
                <span aria-hidden className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10" style={{ background: option.tokens.bg }}>
                  <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: option.tokens.accent }} />
                  <span className="absolute bottom-0 left-0 h-1/2 w-1/2" style={{ background: option.tokens.ink }} />
                </span>
                <span className="text-[13px] font-medium text-ink">{option.name}</span>
                <Radio value={option.id} aria-label={option.name} className="sr-only" />
              </label>
            ))}
          </RadioGroup>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setProDoor({ trigger: "customize", itemId: null, itemName: null })}
          >
            <PaletteIcon aria-hidden /> Personalizar colores y tipografía
            <Lock aria-hidden className="text-ink-muted" />
          </Button>
        </section>

        <section aria-labelledby="pf-cv" className="px-6 pt-8 pb-8">
          <h2 id="pf-cv" className="text-sm font-semibold text-ink">CV</h2>
          <label className="mt-3 flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-paper px-4 py-3 shadow-raised">
            <span>
              <span className="block text-sm text-ink">Permitir descargar tu CV</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">Sin esto, tu CV sigue privado aunque publiques la página.</span>
            </span>
            <Switch checked={cvDownloadable} onCheckedChange={(next) => setCvDownloadable(next)} className="mt-0.5" />
          </label>
        </section>
      </aside>

      <main className="flex min-h-[48rem] flex-1 flex-col gap-4 p-4 lg:min-h-0 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <SegmentedControl aria-label="Vista previa" value={device} onValueChange={(next) => next && setDevice(next as Device)} className="bg-slate">
            <SegmentedControlItem value="mobile" className="text-on-dark data-checked:text-ink hover:text-inverse data-checked:hover:text-ink">
              <Smartphone aria-hidden /> Celular
            </SegmentedControlItem>
            <SegmentedControlItem value="desktop" className="text-on-dark data-checked:text-ink hover:text-inverse data-checked:hover:text-ink">
              <Monitor aria-hidden /> Escritorio
            </SegmentedControlItem>
          </SegmentedControl>
          <Link href={publicHref} target="_blank" className={buttonStyles({ variant: "dark", size: "sm" })}>
            Abrir página <ExternalLink aria-hidden />
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 items-start justify-center">
          <div
            className={cn(
              "h-full overflow-y-auto overscroll-contain bg-paper shadow-panel transition-[width,border-radius] duration-300 ease-out motion-reduce:transition-none",
              device === "mobile" ? "w-[390px] max-w-full rounded-[34px]" : "w-full rounded-2xl",
            )}
          >
            <PortfolioView portfolio={preview} />
          </div>
        </div>
      </main>

      <ProDoor request={proDoor} onClose={() => setProDoor(null)} />
      <Toaster />
    </div>
  )
}

"use client"

import { ExternalLink, Lock, Monitor, Palette as PaletteIcon, Smartphone } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { findPalette, findTemplate, palettes, templates } from "../catalog"
import { PortfolioView } from "../templates"
import { paletteStyle } from "../theme"
import type { Palette, PortfolioTemplate, PublicPortfolio } from "../types"
import { ProDoor, type ProDoorRequest } from "./pro-door"
import { TemplateThumbnail } from "./thumbnails"

type Device = "mobile" | "desktop"
type Tone = "dark" | "light"

type PickerProps = {
  tone: Tone
  palette: Palette
  templateId: string
  paletteId: string
  onTemplate: (template: PortfolioTemplate, cancel: () => void) => void
  onPalette: (id: string) => void
  onCustomize: () => void
}

function templateLabel(template: PortfolioTemplate) {
  return `${template.name}${template.tier === "pro" ? ", Pro" : ""}. ${template.description}`
}

function TemplatePicker({ tone, palette, templateId, onTemplate }: PickerProps) {
  const dark = tone === "dark"
  return (
    <RadioGroup
      aria-label="Plantilla"
      value={templateId}
      onValueChange={(next, details) => {
        const template = next ? findTemplate(next) : undefined
        if (template) onTemplate(template, () => details.cancel())
      }}
      className={dark ? "gap-1" : "-mx-5 flex-row gap-2.5 overflow-x-auto px-5 pt-0.5 pb-2 [scrollbar-width:none]"}
    >
      {templates.map((template) =>
        dark ? (
          <label
            key={template.id}
            className="relative flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate has-data-checked:bg-slate has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-strong"
          >
            <span aria-hidden style={paletteStyle(palette)} className="h-[42px] w-14 shrink-0 overflow-hidden rounded-md">
              <TemplateThumbnail templateId={template.id} className="h-[108px] w-36 origin-top-left scale-[0.389]" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-inverse">{template.name}</span>
              <span className="text-xs leading-snug text-on-dark-muted">{template.description}</span>
            </span>
            {template.tier === "pro" && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-on-dark-muted">
                <Lock aria-hidden className="size-3" /> Pro
              </span>
            )}
            <Radio value={template.id} aria-label={templateLabel(template)} className="sr-only" />
          </label>
        ) : (
          <label
            key={template.id}
            style={paletteStyle(palette)}
            className="pressable relative flex w-36 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-paper shadow-raised has-data-checked:ring-2 has-data-checked:ring-ink has-focus-visible:ring-2 has-focus-visible:ring-accent-strong"
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
            <Radio value={template.id} aria-label={templateLabel(template)} className="sr-only" />
          </label>
        ),
      )}
    </RadioGroup>
  )
}

function PalettePicker({ tone, paletteId, palette, onPalette, onCustomize }: PickerProps) {
  const dark = tone === "dark"
  return (
    <div className="flex flex-col gap-3">
      <RadioGroup aria-label="Colores" value={paletteId} onValueChange={(next) => next && onPalette(next)} className="flex-row flex-wrap gap-3">
        {palettes.map((option) => (
          <label
            key={option.id}
            title={option.name}
            className={cn(
              "pressable relative block size-9 cursor-pointer overflow-hidden rounded-full ring-offset-2 has-data-checked:ring-2 has-focus-visible:ring-2 has-focus-visible:ring-accent-strong",
              dark ? "ring-offset-night has-data-checked:ring-inverse" : "ring-offset-paper has-data-checked:ring-ink",
            )}
            style={{ background: option.tokens.bg }}
          >
            <span aria-hidden className="absolute inset-y-0 right-0 w-1/2" style={{ background: option.tokens.accent }} />
            <span aria-hidden className="absolute bottom-0 left-0 size-1/2" style={{ background: option.tokens.ink }} />
            <Radio value={option.id} aria-label={option.name} className="sr-only" />
          </label>
        ))}
      </RadioGroup>
      <p className={cn("text-sm", dark ? "text-on-dark" : "text-ink")}>{palette.name}</p>
      <Button variant={dark ? "dark" : "secondary"} size="sm" className="w-fit" onClick={onCustomize}>
        <PaletteIcon aria-hidden /> Personalizar colores y tipografía
        <Lock aria-hidden className="opacity-60" />
      </Button>
    </div>
  )
}

export function PortfolioEditor({ portfolio }: { portfolio: PublicPortfolio }) {
  const [templateId, setTemplateId] = useState(portfolio.template_id)
  const [paletteId, setPaletteId] = useState(portfolio.palette.id)
  const [cvDownloadable, setCvDownloadable] = useState(false)
  const [device, setDevice] = useState<Device>("desktop")
  const [proDoor, setProDoor] = useState<ProDoorRequest | null>(null)

  const palette = findPalette(paletteId) ?? portfolio.palette
  const preview: PublicPortfolio = {
    ...portfolio,
    template_id: templateId,
    palette,
    cv_url: cvDownloadable ? "#cv" : null,
  }
  const publicHref = `/p/${portfolio.slug}?plantilla=${templateId}&paleta=${paletteId}`

  const picker = {
    palette,
    templateId,
    paletteId,
    onTemplate: (template: PortfolioTemplate, cancel: () => void) => {
      if (template.tier === "pro") {
        cancel()
        setProDoor({ trigger: "template", itemId: template.id, itemName: template.name })
        return
      }
      setTemplateId(template.id)
    },
    onPalette: setPaletteId,
    onCustomize: () => setProDoor({ trigger: "customize", itemId: null, itemName: null }),
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:h-dvh lg:flex-none lg:grid-cols-[380px_1fr] lg:grid-rows-[minmax(0,1fr)]">
      <aside className="hidden bg-night px-10 py-12 lg:flex lg:flex-col lg:gap-10 lg:overflow-y-auto">
        <header className="flex flex-col gap-2">
          <p className="font-display text-3xl tracking-display text-inverse">Tren Solar</p>
          <p className="text-sm leading-relaxed text-on-dark-muted">Elegí cómo se ve tu portfolio. Los hechos son los que ya aprobaste.</p>
        </header>
        <section className="-mx-2 flex flex-col gap-3">
          <h2 className="px-2 text-sm font-medium text-inverse">Plantilla</h2>
          <TemplatePicker tone="dark" {...picker} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-inverse">Colores</h2>
          <PalettePicker tone="dark" {...picker} />
        </section>
        <p className="mt-auto text-[13px] text-on-dark-muted">Nada se publica sin tu OK.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:bg-cream">
        <div className="flex flex-col gap-1 px-4 pt-8 lg:hidden">
          <p className="font-display text-2xl tracking-display text-inverse">Tren Solar</p>
          <p className="text-[13px] text-on-dark-muted">Los hechos son los que ya aprobaste.</p>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-5 pb-4 lg:min-h-0 lg:px-16 lg:pt-14 lg:pb-8">
          <div className="rounded-[22px] bg-paper p-5 shadow-raised lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl tracking-display text-ink sm:text-4xl">Tu portfolio</h1>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">Así lo ve quien abre tu link.</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="neutral">Datos de ejemplo</Badge>
                <SegmentedControl aria-label="Vista previa" value={device} onValueChange={(next) => next && setDevice(next as Device)} className="hidden lg:inline-flex">
                  <SegmentedControlItem value="desktop">
                    <Monitor aria-hidden /> Escritorio
                  </SegmentedControlItem>
                  <SegmentedControlItem value="mobile">
                    <Smartphone aria-hidden /> Celular
                  </SegmentedControlItem>
                </SegmentedControl>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:hidden">
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-ink">Plantilla</h2>
                <TemplatePicker tone="light" {...picker} />
              </section>
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-ink">Colores</h2>
                <PalettePicker tone="light" {...picker} />
              </section>
            </div>
          </div>

          <div className="mt-4 flex justify-center lg:mt-8 lg:min-h-0 lg:flex-1">
            <div
              key={templateId}
              className={cn(
                "relative animate-step-in overflow-hidden rounded-[22px] bg-paper shadow-panel transition-[width] duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none lg:overflow-y-auto lg:overscroll-contain lg:shadow-popover",
                device === "mobile" ? "w-full lg:w-[390px]" : "w-full",
              )}
            >
              <PortfolioView portfolio={preview} />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-hairline bg-night/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mx-0 lg:mt-6 lg:bg-transparent lg:px-0 lg:pt-6 lg:pb-0 lg:backdrop-blur-none">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-inverse lg:text-ink">
              <Switch checked={cvDownloadable} onCheckedChange={(next) => setCvDownloadable(next)} />
              CV descargable
            </label>
            <Link href={publicHref} target="_blank" className={cn(buttonStyles(), "ml-auto")}>
              Abrir página <ExternalLink aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <ProDoor request={proDoor} onClose={() => setProDoor(null)} />
    </div>
  )
}

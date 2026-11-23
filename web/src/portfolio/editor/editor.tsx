"use client"

import { ExternalLink, Globe, Lock, Monitor, Palette as PaletteIcon, Smartphone } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
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
  onTemplate: (template: PortfolioTemplate) => void
  onPalette: (id: string) => void
  onCustomize: () => void
  onDomain: () => void
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
      onValueChange={(next) => {
        const template = next ? findTemplate(next) : undefined
        if (template) onTemplate(template)
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
            <TemplateThumbnail templateId={template.id} className="aspect-[4/3]" />
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

function PalettePicker({ tone, paletteId, palette, onPalette }: PickerProps) {
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
    </div>
  )
}

function ProOptions({ tone, onCustomize, onDomain }: PickerProps) {
  const dark = tone === "dark"
  const variant = dark ? "dark" : "secondary"
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant={variant} size="sm" onClick={onCustomize}>
        <PaletteIcon aria-hidden /> Personalizar colores y tipografía
        <Lock aria-hidden className="opacity-60" />
      </Button>
      <Button variant={variant} size="sm" onClick={onDomain}>
        <Globe aria-hidden /> Usar tu propio dominio
        <Lock aria-hidden className="opacity-60" />
      </Button>
    </div>
  )
}

type PortfolioEditorProps = {
  portfolio: PublicPortfolio
  isDemo?: boolean
  publicSlug?: string | null
  hasCv?: boolean
  onTemplateChange?: (templateId: string) => Promise<void>
  onPaletteChange?: (paletteId: string) => Promise<void>
  onCvDownloadableChange?: (value: boolean) => Promise<void>
  onPublish?: () => Promise<void>
  /** Rendered inside the /app shell: no brand header, action bar above the bottom nav. */
  embedded?: boolean
  /** Published page exists but is behind the draft (e.g. new approved achievements). */
  outdatedSlug?: string | null
}

export function PortfolioEditor({
  portfolio,
  isDemo = false,
  publicSlug = null,
  hasCv = false,
  onTemplateChange,
  onPaletteChange,
  onCvDownloadableChange,
  onPublish,
  embedded = false,
  outdatedSlug = null,
}: PortfolioEditorProps) {
  const [templateId, setTemplateId] = useState(portfolio.template_id)
  const [paletteId, setPaletteId] = useState(portfolio.palette.id)
  const [cvDownloadable, setCvDownloadable] = useState(portfolio.cv_url !== null)
  const [device, setDevice] = useState<Device>("desktop")
  const [proDoor, setProDoor] = useState<ProDoorRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const palette = findPalette(paletteId) ?? portfolio.palette
  const template = findTemplate(templateId)
  const isPro = template?.tier === "pro"
  const preview: PublicPortfolio = {
    ...portfolio,
    template_id: templateId,
    palette,
    cv_url: cvDownloadable ? "#cv" : null,
  }
  const publicHref = publicSlug
    ? `/p/${publicSlug}`
    : isDemo
      ? `/p/${portfolio.slug}?plantilla=${templateId}&paleta=${paletteId}`
      : null

  async function applyTemplate(id: string) {
    setTemplateId(id)
    if (!onTemplateChange) return
    setSaving(true)
    try {
      await onTemplateChange(id)
    } catch {
      toast.error("No se pudo guardar la plantilla")
      setTemplateId(portfolio.template_id)
    } finally {
      setSaving(false)
    }
  }

  async function applyPalette(id: string) {
    setPaletteId(id)
    if (!onPaletteChange) return
    setSaving(true)
    try {
      await onPaletteChange(id)
    } catch {
      toast.error("No se pudo guardar la paleta")
      setPaletteId(portfolio.palette.id)
    } finally {
      setSaving(false)
    }
  }

  async function applyCvDownloadable(next: boolean) {
    setCvDownloadable(next)
    if (!onCvDownloadableChange) return
    setSaving(true)
    try {
      await onCvDownloadableChange(next)
    } catch {
      toast.error("No se pudo actualizar el CV")
      setCvDownloadable(!next)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!onPublish) return
    if (!hasCv) {
      toast.error("Subí tu CV en el onboarding", {
        description: "Es obligatorio para publicar el portfolio.",
      })
      return
    }
    setPublishing(true)
    try {
      await onPublish()
      toast.success("Portfolio publicado")
    } catch {
      toast.error("No se pudo publicar", { description: "Revisá tu CV y volvé a intentar." })
    } finally {
      setPublishing(false)
    }
  }

  const picker = {
    palette,
    templateId,
    paletteId,
    onTemplate: (template: PortfolioTemplate) =>
      template.tier === "pro" ? setTemplateId(template.id) : void applyTemplate(template.id),
    onPalette: (id: string) => void applyPalette(id),
    onCustomize: () => setProDoor({ trigger: "customize", itemId: null, itemName: null }),
    onDomain: () => setProDoor({ trigger: "domain", itemId: null, itemName: null }),
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:h-dvh lg:flex-none lg:grid-cols-[380px_1fr] lg:grid-rows-[minmax(0,1fr)]">
      <aside className="hidden bg-night px-10 py-12 [scrollbar-color:var(--color-slate-hover)_transparent] [scrollbar-width:thin] lg:flex lg:flex-col lg:gap-10 lg:overflow-y-auto">
        <header className="flex flex-col gap-2">
          <p className="font-display text-3xl tracking-display text-inverse">{embedded ? "Diseño" : "chambeAR"}</p>
          <p className="text-sm leading-relaxed text-on-dark-muted">Elegí plantilla y colores. Lo que dice ya lo aprobaste vos.</p>
        </header>
        <section className="-mx-2 flex flex-col gap-3">
          <h2 className="px-2 text-sm font-medium text-inverse">Plantilla</h2>
          <TemplatePicker tone="dark" {...picker} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-inverse">Colores</h2>
          <PalettePicker tone="dark" {...picker} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-inverse">Con Pro</h2>
          <ProOptions tone="dark" {...picker} />
        </section>
        <p className="mt-auto text-[13px] text-on-dark-muted">Nada se publica sin tu OK.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:bg-cream">
        <div className={cn("flex flex-col gap-1 px-4 pt-8 lg:hidden", embedded && "hidden")}>
          <p className="font-display text-2xl tracking-display text-inverse">chambeAR</p>
          <p className="text-[13px] text-on-dark-muted">Lo que dice ya lo aprobaste vos.</p>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-5 pb-4 lg:min-h-0 lg:px-16 lg:pt-14 lg:pb-8">
          <div className="rounded-[22px] bg-paper p-5 shadow-raised lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl tracking-display text-ink sm:text-4xl">Tu portfolio</h1>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {isPro ? `${template.name} es una plantilla Pro. Podés mirarla, pero todavía no publicarla.` : "Así lo ve quien abre tu link."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isDemo && <Badge variant="neutral">Datos de ejemplo</Badge>}
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
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-ink">Con Pro</h2>
                <ProOptions tone="light" {...picker} />
              </section>
            </div>
          </div>

          <div className="mt-4 flex justify-center lg:mt-8 lg:min-h-0 lg:flex-1">
            <div
              key={templateId}
              className={cn(
                "relative animate-step-in overflow-hidden rounded-[22px] bg-paper shadow-panel transition-[width] duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none lg:overflow-y-auto lg:overscroll-contain lg:shadow-popover lg:[scrollbar-color:rgb(61_63_84/0.28)_transparent] lg:[scrollbar-width:thin]",
                device === "mobile" ? "w-full lg:w-[390px]" : "w-full",
              )}
            >
              <PortfolioView portfolio={preview} />
            </div>
          </div>

          <div
            className={cn(
              "sticky -mx-4 mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-hairline bg-night/90 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:mt-6 lg:bg-transparent lg:px-0 lg:pt-6 lg:pb-0 lg:backdrop-blur-none",
              embedded ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
            )}
          >
            <label className="flex cursor-pointer items-center gap-3 text-sm text-inverse lg:text-ink">
              <Switch checked={cvDownloadable} onCheckedChange={(next) => void applyCvDownloadable(next)} />
              CV descargable
            </label>
            {isPro ? (
              <Button className="ml-auto" onClick={() => setProDoor({ trigger: "template", itemId: template.id, itemName: template.name })}>
                <Lock aria-hidden /> Quiero esta plantilla
              </Button>
            ) : publicHref ? (
              <Link href={publicHref} target="_blank" className={cn(buttonStyles(), "ml-auto")}>
                Abrir página <ExternalLink aria-hidden />
              </Link>
            ) : (
              !isDemo &&
              onPublish && (
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {outdatedSlug && (
                    <Link
                      href={`/p/${outdatedSlug}`}
                      target="_blank"
                      className={cn(buttonStyles({ variant: "ghost" }), "text-inverse hover:bg-slate lg:text-ink lg:hover:bg-fill-soft")}
                    >
                      Ver versión publicada
                    </Link>
                  )}
                  <Button disabled={publishing || saving} onClick={() => void handlePublish()}>
                    {outdatedSlug ? "Actualizar página" : "Publicar"}
                  </Button>
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <ProDoor request={proDoor} onClose={() => setProDoor(null)} />
    </div>
  )
}

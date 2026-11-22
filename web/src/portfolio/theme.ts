import type { CSSProperties } from "react"
import type { Palette } from "./types"

export function paletteStyle(palette: Palette): CSSProperties {
  const { bg, surface, ink, muted, accent, on_accent } = palette.tokens
  return {
    "--pf-bg": bg,
    "--pf-surface": surface,
    "--pf-ink": ink,
    "--pf-muted": muted,
    "--pf-accent": accent,
    "--pf-on-accent": on_accent,
    colorScheme: palette.scheme,
  } as CSSProperties
}

const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

export function formatOccurredOn(value: string | null) {
  if (!value) return null
  const [year, month] = value.split("-")
  const name = months[Number(month) - 1]
  return name ? `${name} de ${year}` : year
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name
}

export function monthAndYear(value: string | null) {
  if (!value) return null
  const [year, month] = value.split("-")
  return { year, month: months[Number(month) - 1] ?? null }
}

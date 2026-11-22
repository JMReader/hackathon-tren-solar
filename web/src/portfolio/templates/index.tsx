import type { ComponentType } from "react"
import { Caso } from "./caso"
import { Editorial } from "./editorial"
import { Estratos } from "./estratos"
import { Presentacion } from "./presentacion"
import { Telar } from "./telar"
import { Terminal } from "./terminal"
import { Credencial } from "./credencial"
import { Esencial } from "./esencial"
import { Galeria } from "./galeria"
import { Recorrido } from "./recorrido"
import type { TemplateProps } from "./shell"

const renderers: Record<string, ComponentType<TemplateProps>> = {
  esencial: Esencial,
  galeria: Galeria,
  recorrido: Recorrido,
  credencial: Credencial,
  caso: Caso,
  estratos: Estratos,
  editorial: Editorial,
  telar: Telar,
  terminal: Terminal,
  presentacion: Presentacion,
}

export function PortfolioView({ portfolio }: TemplateProps) {
  const Template = renderers[portfolio.template_id] ?? Esencial
  return <Template portfolio={portfolio} />
}

export function hasRenderer(templateId: string) {
  return templateId in renderers
}

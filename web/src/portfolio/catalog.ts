import type { Palette, PortfolioTemplate } from "./types"

export const templates: PortfolioTemplate[] = [
  { id: "esencial", name: "Esencial", tier: "free", description: "Una columna con tus logros y sus hechos. La que se lee más rápido." },
  { id: "galeria", name: "Galería", tier: "free", description: "Tus fotos al frente. Cada una abre los hechos del logro." },
  { id: "recorrido", name: "Recorrido", tier: "free", description: "Tus logros en orden, del más reciente al primero." },
  { id: "credencial", name: "Credencial", tier: "free", description: "Todo en una pantalla de celular, para mandar por WhatsApp." },
  { id: "caso", name: "Caso", tier: "free", description: "Un logro en grande y el resto debajo." },
  { id: "estratos", name: "Estratos", tier: "pro", description: "Cada logro en una banda de color derivada de tu paleta." },
  { id: "editorial", name: "Editorial", tier: "pro", description: "Tipografía grande. Cada logro se lee como una nota." },
  { id: "telar", name: "Telar", tier: "pro", description: "Encabezado geométrico generado con tus colores." },
  { id: "terminal", name: "Terminal", tier: "pro", description: "Tus logros como el historial de un repositorio." },
  { id: "presentacion", name: "Presentación", tier: "pro", description: "Un logro por pantalla, para mostrar en una entrevista." },
]

export const palettes: Palette[] = [
  { id: "azul-salina", name: "Azul salina", tier: "free", scheme: "light", tokens: { bg: "#F4F7F9", surface: "#FFFFFF", ink: "#16242E", muted: "#4F6170", accent: "#1F5F8B", on_accent: "#FFFFFF" } },
  { id: "verde-yunga", name: "Verde yunga", tier: "free", scheme: "light", tokens: { bg: "#F2F6F1", surface: "#FFFFFF", ink: "#12261A", muted: "#4A5F51", accent: "#22693F", on_accent: "#FFFFFF" } },
  { id: "ocre-puna", name: "Ocre puna", tier: "free", scheme: "light", tokens: { bg: "#F7F3EB", surface: "#FFFDF8", ink: "#2A2219", muted: "#62574A", accent: "#7A5A1E", on_accent: "#FFFFFF" } },
  { id: "violeta-cerro", name: "Violeta cerro", tier: "free", scheme: "light", tokens: { bg: "#F7F4F8", surface: "#FFFFFF", ink: "#2A1C30", muted: "#5F5066", accent: "#7A3E86", on_accent: "#FFFFFF" } },
  { id: "gris-piedra", name: "Gris piedra", tier: "free", scheme: "light", tokens: { bg: "#F3F3F1", surface: "#FFFFFF", ink: "#1E1F21", muted: "#56585C", accent: "#3D4A57", on_accent: "#FFFFFF" } },
  { id: "indigo-noche", name: "Índigo noche", tier: "free", scheme: "dark", tokens: { bg: "#121729", surface: "#1B2138", ink: "#E9EBF3", muted: "#A9B0C7", accent: "#A8BCFF", on_accent: "#121729" } },
]

export function findTemplate(id: string) {
  return templates.find((template) => template.id === id)
}

export function findPalette(id: string) {
  return palettes.find((palette) => palette.id === id)
}

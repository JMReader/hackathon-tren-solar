import { Archivo, Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google"

export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  preload: false,
})

export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
})

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  preload: false,
})

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  preload: false,
})

export const portfolioFonts = `${archivo.variable} ${bricolage.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`

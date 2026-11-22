"use client"

import { ArrowUpRight, Mic, Search, Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar"
import { Badge, StatusDot } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CopyButton } from "@/components/ui/copy-button"
import { DateInput } from "@/components/ui/date-input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogDismiss,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  formatFileSize,
} from "@/components/ui/file-input"
import { Input, InputClear, InputGroup } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toaster, toast } from "@/components/ui/toast"
import { Toggle, ToggleGroup } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Display, Eyebrow, Highlight } from "@/components/ui/typography"
import { ShimmeringText } from "@/components/audio/shimmering-text"
import { CompactPlayerDemo, OrbDemo, PlayerDemo, RecorderDemo, VoiceButtonDemo } from "./audio-demos"

const sections = [
  ["fundamentos", "Fundamentos"],
  ["audio", "Audio"],
  ["botones", "Botones"],
  ["cards", "Cards"],
  ["inputs", "Inputs"],
  ["eleccion", "Elección"],
  ["navegacion", "Select y tabs"],
  ["fecha", "Fecha"],
  ["overlays", "Overlays"],
  ["feedback", "Feedback"],
  ["datos", "Datos"],
  ["archivos", "Archivos"],
] as const

const swatches = [
  ["night", "#2d2e3e", "Fondo de app"],
  ["slate", "#3e3f52", "Superficie oscura"],
  ["cream", "#f7f0f0", "Panel"],
  ["paper", "#ffffff", "Cards e inputs"],
  ["sunken", "#ece3e1", "Chips y tracks"],
  ["ink", "#3d3f54", "Texto"],
  ["ink-muted", "#5f6173", "Texto secundario"],
  ["accent", "#ff5c0a", "Marca"],
  ["accent-strong", "#cc4600", "CTA y foco"],
] as const

const motion = [
  ["--ease-out", "cubic-bezier(.23, 1, .32, 1)", "Entradas, popovers, press"],
  ["--ease-in-out", "cubic-bezier(.77, 0, .175, 1)", "Movimiento en pantalla"],
  ["--ease-drawer", "cubic-bezier(.32, .72, 0, 1)", "Drawer / sheets"],
  ["press", "160ms · scale(.97)", "Todo lo presionable"],
  ["popup", "180ms in · 120ms out", "Select, popover, date picker"],
  ["tooltip", "125ms · 0ms en grupo", "Instantáneo tras el primero"],
  ["modal", "220ms in · 150ms out", "Dialog, alert dialog"],
  ["toast", "400ms ease", "Stack estilo Sonner"],
] as const

const facts = [
  { id: "f1", text: "Migré el front de la app de turnos a Next.js 16", source: "transcript", status: "Aprobado" },
  { id: "f2", text: "3 años como desarrollador frontend en San Salvador de Jujuy", source: "cv", status: "Editado" },
  {
    id: "f3",
    text: "Coordiné con el equipo de diseño la migración completa del sistema de componentes, incluyendo tokens, documentación y la guía de accesibilidad",
    source: "user",
    status: "Pendiente",
  },
] as const

function Section({ id, eyebrow, title, description, children }: { id: string; eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-10 border-t border-divider pt-14 first:border-0 first:pt-0">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-display text-[40px] leading-[1.02] font-light tracking-[-0.035em] text-ink">{title}</h2>
      {description && <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">{description}</p>}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </section>
  )
}

function Demo({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">{label}</p>
      {children}
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

export default function UIPage() {
  return (
    <div className="min-h-dvh bg-night">
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-14 text-center sm:pt-24">
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-slate px-3.5 py-1.5 text-xs font-medium text-on-dark">
          <span className="size-1.5 rounded-full bg-accent" /> Tren Solar · UI kit
        </p>
        <Display className="mx-auto max-w-3xl text-on-dark">
          De una idea suelta a un <span className="text-inverse">post claro</span>
        </Display>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-on-dark-muted">
          Componentes sobre <span className="font-semibold text-on-dark">ui-sdk</span> con el lenguaje de AudioPen y el motion de Emil
          Kowalski: curvas fuertes, press que responde, popups que nacen del trigger.
        </p>
      </header>

      <div className="mx-auto flex max-w-[1360px] gap-8 px-3 pb-24 sm:px-6">
        <nav aria-label="Secciones" className="sticky top-8 hidden h-fit w-44 shrink-0 flex-col gap-0.5 lg:flex">
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="focus-ring rounded-full px-3.5 py-1.5 text-sm text-on-dark-muted transition-colors duration-150 hover:bg-slate hover:text-inverse"
            >
              {label}
            </a>
          ))}
        </nav>

        <main className="min-w-0 flex-1 rounded-[32px] bg-cream px-6 py-12 shadow-panel sm:rounded-[48px] sm:px-14 sm:py-16">
          <div className="flex flex-col gap-14">
            <Section id="fundamentos" eyebrow="Fundamentos" title="Color, tipo y motion" description="Slate cálido sobre papel rosado, un naranja que solo aparece cuando hay que actuar. Fraunces para titulares, DM Sans para todo lo demás.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {swatches.map(([name, hex, use]) => (
                  <div key={name} className="overflow-hidden rounded-[18px] bg-paper shadow-raised">
                    <div className="h-16" style={{ background: hex }} />
                    <div className="px-3.5 py-3">
                      <p className="text-[13px] font-semibold text-ink">{name}</p>
                      <p className="text-xs text-ink-muted tabular-nums">{hex}</p>
                      <p className="mt-1 text-xs text-ink-muted">{use}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Demo label="Tipografía">
                  <div className="flex flex-col gap-4 rounded-[22px] bg-paper p-6 shadow-raised">
                    <p className="font-display text-5xl leading-none font-light tracking-[-0.045em] text-ink">Pensá en voz alta.</p>
                    <p className="font-display text-2xl leading-tight tracking-display text-ink">Fraunces 400 · títulos de sección</p>
                    <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink">
                      DM Sans para el cuerpo. Contá tu logro con tus palabras y lo convertimos en un{" "}
                      <Highlight>texto listo para compartir</Highlight>.
                    </p>
                    <p className="text-[13px] text-ink-muted">Secundario, metadatos y ayudas · 13px</p>
                  </div>
                </Demo>
                <Demo label="Motion">
                  <div className="overflow-hidden rounded-[22px] bg-paper shadow-raised">
                    {motion.map(([token, value, use]) => (
                      <div key={token} className="grid grid-cols-[6.5rem_12.5rem_minmax(0,1fr)] items-baseline gap-3 px-5 py-2.5 shadow-[inset_0_-1px_0_var(--color-divider)] last:shadow-none">
                        <code className="font-mono text-xs whitespace-nowrap text-accent-strong">{token}</code>
                        <span className="font-mono text-[11px] whitespace-nowrap text-ink tabular-nums">{value}</span>
                        <span className="min-w-0 truncate text-xs text-ink-muted">{use}</span>
                      </div>
                    ))}
                  </div>
                </Demo>
              </div>
            </Section>

            <Section
              id="audio"
              eyebrow="Voz · ElevenLabs UI"
              title="Grabar, escuchar, revisar"
              description="Componentes de ElevenLabs UI portados a nuestro kit: la onda en vivo comparte el micrófono con la grabación, el scrubber muestra la onda real del clip y se maneja con teclado."
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <Demo label="Grabador (usa tu micrófono)">
                  <RecorderDemo />
                </Demo>
                <Demo label="Orbe · estados y paletas">
                  <OrbDemo />
                </Demo>
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <Demo label="Reproductor con transcripción">
                  <PlayerDemo />
                </Demo>
                <div className="flex flex-col gap-8">
                  <Demo label="Voice button">
                    <VoiceButtonDemo />
                  </Demo>
                  <Demo label="Reproductor compacto y estado de carga">
                    <div className="flex flex-col gap-5">
                      <CompactPlayerDemo />
                      <p className="text-[15px]">
                        <ShimmeringText>Generando tus borradores para LinkedIn y X…</ShimmeringText>
                      </p>
                    </div>
                  </Demo>
                </div>
              </div>
            </Section>

            <Section id="botones" eyebrow="Acciones" title="Botones" description="Todos encogen a 0.97 al presionar. El estado pending difumina la etiqueta y muestra el spinner sin cambiar el ancho.">
              <Demo label="Variantes">
                <Row>
                  <Button>
                    <Mic /> Grabar logro
                  </Button>
                  <Button variant="secondary">Secundario</Button>
                  <Button variant="dark">Oscuro</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Descartar</Button>
                </Row>
              </Demo>
              <Demo label="Tamaños y estados">
                <Row>
                  <Button size="sm">Chico</Button>
                  <Button>Mediano</Button>
                  <Button size="lg">Grande</Button>
                  <Button size="icon" variant="secondary" aria-label="Buscar">
                    <Search />
                  </Button>
                  <Button disabled>Deshabilitado</Button>
                  <Button onClick={() => new Promise((r) => setTimeout(r, 2200))}>Publicar (pending)</Button>
                  <CopyButton value="Migré el front a Next.js 16 y el arranque quedó 3x más rápido." />
                </Row>
              </Demo>
            </Section>

            <Section id="cards" eyebrow="Superficies" title="Cards" description="Sombras semitransparentes en vez de bordes. La card oscura es la transcripción; la clara es el resultado — el mismo contraste que usa AudioPen.">
              <div className="grid gap-5 md:grid-cols-2">
                <Card variant="dark">
                  <CardHeader>
                    <CardDescription className="text-[11px] font-semibold tracking-[0.08em] uppercase">Transcripción</CardDescription>
                  </CardHeader>
                  <CardContent className="font-display text-[15px] leading-relaxed italic">
                    “Eh, bueno, la semana pasada terminamos la migración del front a Next 16… y nada, el arranque quedó como tres veces más
                    rápido, eso estuvo bueno.”
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>Migramos a Next.js 16</CardTitle>
                      <Badge variant="accent">
                        <StatusDot /> LinkedIn
                      </Badge>
                    </div>
                    <CardDescription>Borrador · 412 caracteres</CardDescription>
                  </CardHeader>
                  <CardContent>
                    La semana pasada terminamos de migrar el front a Next.js 16. El arranque quedó 3× más rápido y el equipo ya trabaja con
                    Turbopack en todo el flujo.
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">Publicar</Button>
                    <CopyButton value="La semana pasada terminamos de migrar el front a Next.js 16." variant="ghost" />
                  </CardFooter>
                </Card>
              </div>
              <Demo label="Badges">
                <Row>
                  <Badge>Default</Badge>
                  <Badge variant="accent">Del CV</Badge>
                  <Badge variant="outline">Transcript</Badge>
                  <Badge variant="neutral">Borrador</Badge>
                  <Badge variant="danger">
                    <StatusDot /> Falló
                  </Badge>
                </Row>
              </Demo>
            </Section>

            <Section id="inputs" eyebrow="Formularios" title="Inputs y campos">
              <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Nombre del logro</FieldLabel>
                  <Input placeholder="Ej: Migración a Next 16" />
                  <FieldDescription>Así va a figurar en tus borradores.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Buscar hechos</FieldLabel>
                  <InputGroup>
                    <Search aria-hidden />
                    <Input placeholder="Rol, tecnología, fecha…" />
                    <InputClear />
                  </InputGroup>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Hecho editable</FieldLabel>
                  <Textarea defaultValue="Migré el front end a Next.js 16 con Turbopack y el arranque quedó 3× más rápido." />
                </Field>
                <Field invalid>
                  <FieldLabel>Con error</FieldLabel>
                  <Input placeholder="Falta este dato" />
                  <FieldError match>Contanos el rol que tuviste.</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Solo lectura</FieldLabel>
                  <Input readOnly defaultValue="mauro@trensolar.ar" />
                </Field>
              </div>
            </Section>

            <Section id="eleccion" eyebrow="Formularios" title="Elección" description="Los estados marcados usan ink, como los sliders de AudioPen. El naranja queda para la acción principal y los chips seleccionados.">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <Demo label="Checkbox">
                  <div className="flex flex-col gap-3">
                    {["Hecho confirmado", "Incluir foto", "Mencionar al equipo"].map((label, i) => (
                      <label key={label} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                        <Checkbox defaultChecked={i === 0} /> {label}
                      </label>
                    ))}
                  </div>
                </Demo>
                <Demo label="Radio">
                  <RadioGroup defaultValue="medio" aria-label="Nivel de reescritura">
                    {[
                      ["bajo", "Bajo"],
                      ["medio", "Medio"],
                      ["alto", "Alto"],
                    ].map(([value, label]) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                        <Radio value={value} /> {label}
                      </label>
                    ))}
                  </RadioGroup>
                </Demo>
                <Demo label="Switch">
                  <div className="flex flex-col gap-3">
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                      <Switch defaultChecked /> Publicar al aprobar
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                      <Switch /> Incluir foto en X
                    </label>
                    <label className="flex items-center gap-3 text-sm text-ink-muted">
                      <Switch disabled /> Sin conexión
                    </label>
                  </div>
                </Demo>
                <Demo label="Chips (toggle group)">
                  <ToggleGroup defaultValue={["es"]} aria-label="Idioma">
                    <Toggle value="es">Español</Toggle>
                    <Toggle value="en">English</Toggle>
                    <Toggle value="pt">Português</Toggle>
                  </ToggleGroup>
                </Demo>
              </div>
            </Section>

            <Section id="navegacion" eyebrow="Navegación" title="Select, tabs y segmented" description="Los indicadores deslizan con translate en 220ms y no animan su primera ubicación.">
              <div className="grid gap-8 lg:grid-cols-2">
                <Demo label="Select">
                  <Field className="max-w-xs">
                    <FieldLabel>Red destino</FieldLabel>
                    <Select defaultValue="linkedin">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="x">X (Twitter)</SelectItem>
                        <SelectItem value="ambas">Ambas redes</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Demo>
                <Demo label="Segmented control">
                  <SegmentedControl defaultValue="medio" aria-label="Nivel de reescritura">
                    <SegmentedControlItem value="bajo">Bajo</SegmentedControlItem>
                    <SegmentedControlItem value="medio">Medio</SegmentedControlItem>
                    <SegmentedControlItem value="alto">Alto</SegmentedControlItem>
                  </SegmentedControl>
                </Demo>
                <Demo label="Tabs · pill">
                  <Tabs defaultValue="linkedin">
                    <TabsList aria-label="Borradores">
                      <TabsTab value="linkedin">LinkedIn</TabsTab>
                      <TabsTab value="x">X</TabsTab>
                      <TabsTab value="foto" disabled>
                        Foto
                      </TabsTab>
                    </TabsList>
                    <TabsPanel value="linkedin" className="text-sm text-ink-muted">
                      Borrador de LinkedIn, hasta 3.000 caracteres.
                    </TabsPanel>
                    <TabsPanel value="x" className="text-sm text-ink-muted">
                      Borrador de X, 280 caracteres.
                    </TabsPanel>
                    <TabsPanel value="foto" />
                  </Tabs>
                </Demo>
                <Demo label="Tabs · underline">
                  <Tabs defaultValue="todos">
                    <TabsList variant="underline" aria-label="Filtro">
                      <TabsTab value="todos">Todos</TabsTab>
                      <TabsTab value="borradores">Borradores</TabsTab>
                      <TabsTab value="publicados">Publicados</TabsTab>
                    </TabsList>
                  </Tabs>
                </Demo>
              </div>
            </Section>

            <Section id="fecha" eyebrow="Formularios" title="Fecha y calendario">
              <div className="flex flex-wrap items-start gap-10">
                <Calendar defaultValue="2026-11-18" today="2026-11-22" />
                <div className="grid w-full max-w-xs gap-6">
                  <Field>
                    <FieldLabel>Fecha del logro</FieldLabel>
                    <DatePicker />
                  </Field>
                  <Field>
                    <FieldLabel>Fecha escrita</FieldLabel>
                    <DateInput />
                    <FieldDescription>Día, mes y año.</FieldDescription>
                  </Field>
                </div>
              </div>
            </Section>

            <Section id="overlays" eyebrow="Capas" title="Overlays" description="Dialogs centrados; popovers y tooltips crecen desde su trigger. Probá pasar rápido entre los dos tooltips: el segundo aparece sin delay ni animación.">
              <Row>
                <Dialog>
                  <DialogTrigger className={buttonStyles()}>Aprobar revisión</DialogTrigger>
                  <DialogBackdrop />
                  <DialogContent>
                    <DialogDismiss />
                    <DialogTitle>¿Aprobar esta revisión?</DialogTitle>
                    <DialogDescription>
                      Con estos hechos generamos los borradores de LinkedIn y X. Vas a poder editarlos antes de publicar.
                    </DialogDescription>
                    <DialogFooter>
                      <DialogClose>Seguir editando</DialogClose>
                      <DialogClose className={buttonStyles({ size: "sm" })}>Aprobar</DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger className={buttonStyles({ variant: "outline" })}>Descartar audio</AlertDialogTrigger>
                  <AlertDialogBackdrop />
                  <AlertDialogContent>
                    <AlertDialogTitle>¿Descartar el audio?</AlertDialogTitle>
                    <AlertDialogDescription>Se pierden la transcripción y los hechos extraídos.</AlertDialogDescription>
                    <div className="mt-5 flex justify-end gap-2">
                      <AlertDialogClose>Cancelar</AlertDialogClose>
                      <AlertDialogClose value="confirm" className={buttonStyles({ variant: "danger", size: "sm" })}>
                        Descartar
                      </AlertDialogClose>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>

                <Popover>
                  <PopoverTrigger className={buttonStyles({ variant: "secondary" })}>
                    <Sparkles className="size-4" /> ¿Cómo funciona?
                  </PopoverTrigger>
                  <PopoverContent>
                    <PopoverTitle>Publicación directa</PopoverTitle>
                    <PopoverDescription>Cuando conectes tu cuenta, este botón publica de verdad. Mientras tanto, copiá el texto.</PopoverDescription>
                  </PopoverContent>
                </Popover>

                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Grabar">
                      <Mic className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Grabar audio</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Abrir post">
                      <ArrowUpRight className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Abrir en LinkedIn</TooltipContent>
                  </Tooltip>
                </div>

                <Drawer>
                  <DrawerTrigger className={buttonStyles({ variant: "dark" })}>Vista previa</DrawerTrigger>
                  <DrawerBackdrop />
                  <DrawerContent>
                    <DrawerHandle />
                    <DrawerTitle>Así se ve en LinkedIn</DrawerTitle>
                    <DrawerDescription>Revisá texto, foto y red antes de confirmar.</DrawerDescription>
                    <div className="mt-6 flex justify-end">
                      <DrawerClose>Cerrar</DrawerClose>
                    </div>
                  </DrawerContent>
                </Drawer>
              </Row>
            </Section>

            <Section id="feedback" eyebrow="Estado" title="Toast, progreso y carga" description="Los toasts se apilan como Sonner: hover para expandir, swipe para descartar.">
              <Demo label="Toasts">
                <Row>
                  <Button variant="secondary" onClick={() => toast.success("Borrador copiado", { description: "Pegalo en LinkedIn cuando quieras." })}>
                    Éxito
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast.error("No se pudo publicar en X", {
                        description: "La red no respondió. Tu borrador sigue acá.",
                        action: { label: "Reintentar" },
                      })
                    }
                  >
                    Error con acción
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast.promise(new Promise((r) => setTimeout(r, 2000)), {
                        loading: "Publicando en LinkedIn…",
                        success: "Publicado en LinkedIn",
                        error: "No se pudo publicar",
                      })
                    }
                  >
                    Promesa
                  </Button>
                </Row>
              </Demo>
              <div className="grid gap-8 lg:grid-cols-2">
                <Demo label="Progreso">
                  <div className="flex flex-col gap-6">
                    <Progress value={66}>
                      <div className="flex items-center justify-between">
                        <ProgressLabel>Extrayendo hechos del CV</ProgressLabel>
                        <ProgressValue />
                      </div>
                      <ProgressTrack>
                        <ProgressIndicator />
                      </ProgressTrack>
                    </Progress>
                    <Progress value={null}>
                      <ProgressLabel>Transcribiendo audio…</ProgressLabel>
                      <ProgressTrack>
                        <ProgressIndicator />
                      </ProgressTrack>
                    </Progress>
                  </div>
                </Demo>
                <Demo label="Skeleton">
                  <div className="flex items-start gap-3 rounded-[22px] bg-paper p-5 shadow-raised">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2.5 pt-1">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                </Demo>
              </div>
            </Section>

            <Section id="datos" eyebrow="Datos" title="Tabla y avatar">
              <Demo label="Avatares">
                <div className="flex items-center gap-3">
                  {["Mauro Mamani", "Juan Manuel Coro", "Mayko", "Aleksandra Wiśniewska-Kowalczyk"].map((name) => (
                    <Tooltip key={name}>
                      <TooltipTrigger render={<span />} aria-label={name} className="rounded-full">
                        <Avatar>
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{name}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </Demo>
              <Table>
                <TableCaption>Hechos extraídos · revisión 3</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hecho</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facts.map((fact) => (
                    <TableRow key={fact.id}>
                      <TableCell className="max-w-[44ch] leading-snug">{fact.text}</TableCell>
                      <TableCell>
                        <Badge variant={fact.source === "cv" ? "accent" : fact.source === "user" ? "neutral" : "outline"}>{fact.source}</Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-ink-muted">{fact.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section id="archivos" eyebrow="Carga" title="Archivos" description="Arrastrá o pegá un archivo: la zona reacciona al drag y rechaza tipos inválidos en rojo.">
              <div className="max-w-xl">
                <FileInput accept=".pdf,.docx,image/*" multiple>
                  <FileInputDropzone>
                    <span className="flex size-11 items-center justify-center rounded-full bg-accent text-white shadow-accent">
                      <ArrowUpRight className="size-5 rotate-[-45deg]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">Arrastrá tu CV acá</p>
                      <p className="mt-0.5 text-xs text-ink-muted">PDF, DOCX o imagen · hasta 10 MB</p>
                    </div>
                    <FileInputTrigger>Elegir archivo</FileInputTrigger>
                  </FileInputDropzone>
                  <FileInputList aria-label="Archivos elegidos">
                    <FileInputItem>
                      {({ file }) => (
                        <>
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <span className="shrink-0 text-xs text-ink-muted tabular-nums">{formatFileSize(file.size)}</span>
                          <FileInputItemRemove />
                        </>
                      )}
                    </FileInputItem>
                  </FileInputList>
                </FileInput>
              </div>
              <Separator />
              <p className="text-xs text-ink-muted">Fin del kit. Revisá estados con teclado: Tab, flechas, Enter y Escape funcionan en todo.</p>
            </Section>
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  )
}

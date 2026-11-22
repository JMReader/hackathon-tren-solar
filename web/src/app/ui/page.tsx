"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox, CheckboxIndicator } from "@/components/ui/checkbox"
import { DateInput } from "@/components/ui/date-input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
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
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress"
import { Radio, RadioGroup, RadioIndicator } from "@/components/ui/radio"
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@/components/ui/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toaster, toast } from "@/components/ui/toast"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const sections = [
  ["botones", "Botones"],
  ["badges", "Badges y chips"],
  ["cards", "Cards"],
  ["inputs", "Inputs y campos"],
  ["eleccion", "Elección (check, radio, switch)"],
  ["select", "Select y tabs"],
  ["fecha", "Fecha y calendario"],
  ["overlays", "Overlays"],
  ["feedback", "Toast, progress, skeleton"],
  ["datos", "Tabla y avatar"],
  ["archivos", "File input"],
] as const

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-4 rounded-2xl border border-border-card bg-paper p-6 shadow-ambient">
        {children}
      </div>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

export default function UIPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-10">
      <aside className="sticky top-10 hidden h-fit w-48 shrink-0 md:block">
        <p className="font-display text-lg font-semibold text-ink">UI kit</p>
        <p className="mt-1 text-xs text-ink-muted">Granola · ui-sdk</p>
        <nav className="mt-5 flex flex-col gap-1.5">
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-2 py-1 text-sm text-ink-muted transition-colors hover:bg-fill-soft hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-10">
        <Section id="botones" title="Botones">
          <div className="flex flex-col gap-5">
            <Row>
              <Button>Primario</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </Row>
            <Row>
              <Button size="sm">Chico</Button>
              <Button size="md">Mediano</Button>
              <Button size="lg">Grande</Button>
              <Button disabled>Deshabilitado</Button>
              <Button onClick={() => new Promise((r) => setTimeout(r, 2000))}>
                Pending (2s)
              </Button>
            </Row>
          </div>
        </Section>

        <Section id="badges" title="Badges y chips">
          <Row>
            <Badge>Default</Badge>
            <Badge variant="accent">Del CV</Badge>
            <Badge variant="lime">Transcript</Badge>
            <Badge variant="neutral">Borrador</Badge>
            <Badge variant="danger">Falló</Badge>
          </Row>
        </Section>

        <Section id="cards" title="Cards">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>LinkedIn</CardTitle>
                <CardDescription>Borrador listo para publicar</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink">
                  La semana pasada migramos el front a Next.js 16…
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Publicar</Button>
                <Button size="sm" variant="ghost">
                  Copiar
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>X</CardTitle>
                <CardDescription>Estado independiente</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink">
                  Migramos a Next 16 🚀 Turbopack + React 19…
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Publicar</Button>
                <Button size="sm" variant="ghost">
                  Copiar
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        <Section id="inputs" title="Inputs y campos">
          <div className="grid max-w-lg gap-5">
            <Field>
              <FieldLabel>Nombre del logro</FieldLabel>
              <Input placeholder="Ej: Migración a Next 16" />
              <FieldDescription>Como va a figurar en tus borradores.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Con búsqueda</FieldLabel>
              <InputGroup>
                <Input placeholder="Buscar hechos…" />
                <InputClear className="cursor-pointer text-ink-muted hover:text-ink" />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel>Hecho editable</FieldLabel>
              <Textarea defaultValue="Migré el front end a Next.js 16 con Turbopack y quedó 3x más rápido el arranque." />
            </Field>
            <Field invalid>
              <FieldLabel>Con error</FieldLabel>
              <Input defaultValue="" placeholder="Falta este dato" />
              <FieldError>Este campo es obligatorio.</FieldError>
            </Field>
            <div className="flex items-center gap-3">
              <Label htmlFor="demo-input">Label suelto</Label>
              <Input id="demo-input" placeholder="Con htmlFor" className="w-56" />
            </div>
          </div>
        </Section>

        <Section id="eleccion" title="Elección">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-ink">Checkbox</p>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <Checkbox defaultChecked>
                  <CheckboxIndicator />
                </Checkbox>
                Hecho confirmado
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <Checkbox>
                  <CheckboxIndicator />
                </Checkbox>
                Por revisar
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-ink">Radio</p>
              <RadioGroup defaultValue="esencial">
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <Radio value="esencial">
                    <RadioIndicator />
                  </Radio>
                  Esencial
                </label>
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <Radio value="galeria">
                    <RadioIndicator />
                  </Radio>
                  Galería
                </label>
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-ink">Switch</p>
              <label className="flex items-center gap-3 text-sm text-ink">
                <Switch defaultChecked>
                  <SwitchThumb />
                </Switch>
                Publicar al aprobar
              </label>
              <label className="flex items-center gap-3 text-sm text-ink">
                <Switch>
                  <SwitchThumb />
                </Switch>
                Incluir foto en X
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-ink">Toggle</p>
              <Row>
                <Toggle defaultPressed>Negrita</Toggle>
                <Toggle>Itálica</Toggle>
                <Toggle disabled>Emoji</Toggle>
              </Row>
            </div>
          </div>
        </Section>

        <Section id="select" title="Select, tabs y segmented">
          <div className="grid max-w-lg gap-6">
            <Field>
              <FieldLabel>Red destino</FieldLabel>
              <Select defaultValue="linkedin" placeholder="Elegí una red">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">Segmented control</p>
              <SegmentedControl defaultValue="linkedin" aria-label="Red">
                <SegmentedControlIndicator />
                <SegmentedControlItem value="linkedin">LinkedIn</SegmentedControlItem>
                <SegmentedControlItem value="x">X</SegmentedControlItem>
              </SegmentedControl>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">Tabs</p>
              <Tabs defaultValue="linkedin">
                <TabsList aria-label="Borradores">
                  <TabsTab value="linkedin">LinkedIn</TabsTab>
                  <TabsTab value="x">X</TabsTab>
                  <TabsTab value="foto" disabled>
                    Foto
                  </TabsTab>
                </TabsList>
                <TabsPanel value="linkedin">
                  <p className="text-sm text-ink-muted">
                    Borrador de LinkedIn editable…
                  </p>
                </TabsPanel>
                <TabsPanel value="x">
                  <p className="text-sm text-ink-muted">Borrador de X, 280 caracteres…</p>
                </TabsPanel>
                <TabsPanel value="foto" />
              </Tabs>
            </div>
          </div>
        </Section>

        <Section id="fecha" title="Fecha y calendario">
          <div className="flex flex-wrap items-start gap-8">
            <Calendar defaultValue="2026-11-22" />
            <div className="grid max-w-xs gap-5">
              <Field>
                <FieldLabel>Date picker</FieldLabel>
                <DatePicker />
              </Field>
              <Field>
                <FieldLabel>Date input</FieldLabel>
                <DateInput />
                <FieldDescription>Segmentos dd/mm/aaaa.</FieldDescription>
              </Field>
            </div>
          </div>
        </Section>

        <Section id="overlays" title="Overlays">
          <Row>
            <Dialog>
              <DialogTrigger className={buttonStyles()}>Dialog</DialogTrigger>
              <DialogBackdrop />
              <DialogContent>
                <DialogTitle>¿Aprobar esta revisión?</DialogTitle>
                <DialogDescription>
                  Los hechos aprobados se usan para generar los borradores de
                  LinkedIn y X.
                </DialogDescription>
                <div className="mt-6 flex justify-end gap-2">
                  <DialogClose>Cancelar</DialogClose>
                  <DialogClose className={buttonStyles({ size: "sm" })}>
                    Aprobar
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger className={buttonStyles({ variant: "danger" })}>
                Alert dialog
              </AlertDialogTrigger>
              <AlertDialogBackdrop />
              <AlertDialogContent>
                <AlertDialogTitle>¿Descartar el audio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se pierde la transcripción y los hechos extraídos.
                </AlertDialogDescription>
                <div className="mt-6 flex justify-end gap-2">
                  <AlertDialogClose>Cancelar</AlertDialogClose>
                  <AlertDialogClose
                    value="confirm"
                    className={buttonStyles({ variant: "danger", size: "sm" })}
                  >
                    Descartar
                  </AlertDialogClose>
                </div>
              </AlertDialogContent>
            </AlertDialog>

            <Popover>
              <PopoverTrigger className={buttonStyles({ variant: "outline" })}>
                Popover
              </PopoverTrigger>
              <PopoverContent sideOffset={8}>
                <PopoverTitle>Publicación directa</PopoverTitle>
                <PopoverDescription>
                  Cuando Mayko conecte las cuentas, este botón publica de verdad.
                </PopoverDescription>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger className={buttonStyles({ variant: "ghost" })}>
                Tooltip
              </TooltipTrigger>
              <TooltipContent>Copiá el texto si no hay integración</TooltipContent>
            </Tooltip>

            <Drawer>
              <DrawerTrigger className={buttonStyles({ variant: "secondary" })}>
                Drawer
              </DrawerTrigger>
              <DrawerBackdrop />
              <DrawerContent>
                <DrawerHandle />
                <DrawerTitle>Vista previa del post</DrawerTitle>
                <DrawerDescription>
                  Así se va a ver en LinkedIn cuando lo publiques.
                </DrawerDescription>
                <div className="mt-6 flex justify-end">
                  <DrawerClose>Cerrar</DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          </Row>
        </Section>

        <Section id="feedback" title="Toast, progress y skeleton">
          <div className="flex flex-col gap-6">
            <Row>
              <Button
                variant="secondary"
                onClick={() => toast.success("Borrador copiado al portapapeles")}
              >
                Success toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.error("No se pudo publicar en X", {
                    description: "La red respondió timeout. Tu borrador sigue acá.",
                  })
                }
              >
                Error toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast("Publicando en LinkedIn…", { duration: Infinity })
                }
              >
                Sticky toast
              </Button>
            </Row>

            <div className="grid max-w-md gap-5">
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

            <div className="max-w-md space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            <div className="flex items-center gap-4 text-sm text-ink-muted">
              Antes <Separator className="w-16" /> Después
            </div>
          </div>
        </Section>

        <Section id="datos" title="Tabla y avatar">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="/avatar-demo.png" alt="Mauro" />
                <AvatarFallback>MM</AvatarFallback>
              </Avatar>
              <Avatar className="h-12 w-12">
                <AvatarFallback>JM</AvatarFallback>
              </Avatar>
              <Avatar className="h-8 w-8 text-xs">
                <AvatarFallback>MK</AvatarFallback>
              </Avatar>
            </div>

            <Table>
              <TableCaption>Hechos extraídos — revisión 3</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Hecho</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Migré el front a Next 16</TableCell>
                  <TableCell>
                    <Badge variant="lime">transcript</Badge>
                  </TableCell>
                  <TableCell className="text-ink-muted">Aprobado</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3 años como frontend dev</TableCell>
                  <TableCell>
                    <Badge variant="accent">cv</Badge>
                  </TableCell>
                  <TableCell className="text-ink-muted">Editado</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Lideré al equipo de diseño</TableCell>
                  <TableCell>
                    <Badge variant="neutral">user</Badge>
                  </TableCell>
                  <TableCell className="text-ink-muted">Pendiente</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section id="archivos" title="File input">
          <div className="max-w-lg">
            <FileInput accept=".pdf,.docx,image/*" multiple>
              <FileInputDropzone>
                <p className="text-sm font-medium text-ink">
                  Arrastrá tu CV o tocá para elegir
                </p>
                <p className="text-xs text-ink-muted">PDF, DOCX o imagen</p>
                <FileInputTrigger>Elegir archivo</FileInputTrigger>
              </FileInputDropzone>
              <FileInputList aria-label="Archivos elegidos">
                <FileInputItem>
                  {({ file }) => (
                    <>
                      <span className="truncate">{file.name}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
                        {formatFileSize(file.size)}
                        <FileInputItemRemove aria-label="Quitar" />
                      </span>
                    </>
                  )}
                </FileInputItem>
              </FileInputList>
            </FileInput>
          </div>
        </Section>
      </main>

      <Toaster />
    </div>
  )
}

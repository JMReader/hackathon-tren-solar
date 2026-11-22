import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const bar = "rounded-full bg-(--pf-ink)/25"

const layouts: Record<string, ReactNode> = {
  esencial: (
    <div className="grid h-full grid-cols-[5fr_7fr] gap-2 p-3">
      <div className="flex flex-col gap-1.5">
        <span className={cn(bar, "h-2.5 w-full rounded-sm bg-(--pf-ink)/75")} />
        <span className={cn(bar, "h-1 w-2/3")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="h-px w-full bg-(--pf-ink)/70" />
        <span className={cn(bar, "h-1 w-4/5 bg-(--pf-ink)/50")} />
        <span className={cn(bar, "h-1 w-full")} />
        <span className="mt-1 h-px w-full bg-(--pf-ink)/70" />
        <span className={cn(bar, "h-1 w-3/5 bg-(--pf-ink)/50")} />
        <span className={cn(bar, "h-1 w-full")} />
      </div>
    </div>
  ),
  galeria: (
    <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 p-2.5">
      <span className="col-span-2 rounded bg-(--pf-accent)" />
      <span className="rounded bg-(--pf-ink)" />
      <span className="col-span-3 rounded bg-(--pf-surface) ring-1 ring-(--pf-ink)/10 ring-inset" />
    </div>
  ),
  recorrido: (
    <div className="flex h-full flex-col gap-1.5 p-3">
      <span className="h-3.5 w-4/5 rounded-[2px] bg-(--pf-ink)/85" />
      <span className="h-px w-full bg-(--pf-ink)/70" />
      <div className="grid flex-1 grid-cols-[2fr_5fr] content-around gap-x-2">
        <span className="h-2 w-full rounded-[2px] bg-(--pf-accent)" />
        <span className={cn(bar, "h-1 w-full self-center")} />
        <span className="h-2 w-3/4 rounded-[2px] bg-(--pf-accent)" />
        <span className={cn(bar, "h-1 w-4/5 self-center")} />
      </div>
    </div>
  ),
  credencial: (
    <div className="grid h-full place-items-center p-3">
      <div className="grid h-full w-full grid-cols-[5fr_6fr] overflow-hidden rounded-md bg-(--pf-surface)">
        <div className="flex flex-col justify-between bg-(--pf-accent) p-1.5">
          <span className="mx-auto h-1 w-4 rounded-full bg-(--pf-bg)" />
          <span className="h-1.5 w-full rounded-[2px] bg-(--pf-on-accent)" />
        </div>
        <div className="flex flex-col justify-center gap-1.5 p-2">
          <span className={cn(bar, "h-1 w-full")} />
          <span className={cn(bar, "h-1 w-4/5")} />
          <span className={cn(bar, "h-1 w-full")} />
        </div>
      </div>
    </div>
  ),
  caso: (
    <div className="flex h-full flex-col">
      <div className="flex h-3/5 flex-col justify-end gap-1 bg-(--pf-accent) p-3">
        <span className="h-2 w-3/4 rounded-[2px] bg-(--pf-on-accent)" />
        <span className="h-2 w-1/2 rounded-[2px] bg-(--pf-on-accent)" />
      </div>
      <div className="grid flex-1 grid-cols-2 content-center gap-2 px-3">
        <span className={cn(bar, "h-1")} />
        <span className={cn(bar, "h-1")} />
      </div>
    </div>
  ),
  estratos: (
    <div className="flex h-full flex-col">
      <span className="flex-1 bg-(--pf-accent)" />
      <span className="flex-1 bg-(--pf-accent)/60" />
      <span className="flex-1 bg-(--pf-accent)/30" />
      <span className="flex-1 bg-(--pf-surface)" />
    </div>
  ),
  editorial: (
    <div className="flex h-full flex-col gap-1 p-3">
      <span className={cn(bar, "h-3 w-full rounded-sm bg-(--pf-ink)/75")} />
      <span className={cn(bar, "h-3 w-2/3 rounded-sm bg-(--pf-ink)/75")} />
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <span className={cn(bar, "h-1")} />
        <span className={cn(bar, "h-1")} />
        <span className={cn(bar, "h-1")} />
        <span className={cn(bar, "h-1")} />
      </div>
    </div>
  ),
  telar: (
    <div className="flex h-full flex-col">
      <div className="grid h-1/2 grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={i % 3 === 0 ? "bg-(--pf-accent)" : i % 3 === 1 ? "bg-(--pf-accent)/40" : "bg-(--pf-surface)"} style={{ clipPath: i % 2 ? "polygon(50% 0,100% 100%,0 100%)" : "polygon(0 0,100% 0,50% 100%)" }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <span className={cn(bar, "h-1.5 w-12 bg-(--pf-ink)/60")} />
        <span className={cn(bar, "h-1 w-full")} />
      </div>
    </div>
  ),
  terminal: (
    <div className="flex h-full flex-col gap-1 bg-(--pf-ink) p-3">
      <span className="h-1 w-10 rounded-full bg-(--pf-accent)" />
      <span className="h-1 w-16 rounded-full bg-(--pf-bg)/40" />
      <span className="h-1 w-12 rounded-full bg-(--pf-bg)/40" />
      <span className="h-1 w-8 rounded-full bg-(--pf-accent)" />
      <span className="h-1 w-14 rounded-full bg-(--pf-bg)/40" />
    </div>
  ),
  presentacion: (
    <div className="grid h-full place-items-center bg-(--pf-accent) p-3">
      <span className="h-2 w-16 rounded-sm bg-(--pf-on-accent)/85" />
    </div>
  ),
}

export function TemplateThumbnail({ templateId, className }: { templateId: string; className?: string }) {
  return <div className={cn("overflow-hidden bg-(--pf-bg)", className)}>{layouts[templateId]}</div>
}

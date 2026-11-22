import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const bar = "rounded-full bg-(--pf-ink)/25"

const layouts: Record<string, ReactNode> = {
  esencial: (
    <div className="flex h-full flex-col gap-1.5 p-3">
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-(--pf-accent)" />
        <span className={cn(bar, "h-1.5 w-12 bg-(--pf-ink)/60")} />
      </div>
      <span className={cn(bar, "mt-1.5 h-1 w-16 bg-(--pf-ink)/45")} />
      <span className={cn(bar, "h-1 w-full")} />
      <span className={cn(bar, "h-1 w-4/5")} />
      <span className={cn(bar, "mt-1.5 h-1 w-14 bg-(--pf-ink)/45")} />
      <span className={cn(bar, "h-1 w-full")} />
    </div>
  ),
  galeria: (
    <div className="grid h-full grid-cols-3 gap-1 p-2.5">
      <span className="rounded bg-(--pf-accent)" />
      <span className="rounded bg-(--pf-surface)" />
      <span className="rounded bg-(--pf-accent)/30" />
      <span className="rounded bg-(--pf-accent)/30" />
      <span className="rounded bg-(--pf-accent)" />
      <span className="rounded bg-(--pf-surface)" />
    </div>
  ),
  recorrido: (
    <div className="flex h-full flex-col gap-1.5 p-3">
      <span className={cn(bar, "h-2 w-14 rounded-sm bg-(--pf-ink)/70")} />
      <div className="mt-1 flex flex-1 flex-col justify-around border-l-2 border-(--pf-accent) pl-2">
        <span className={cn(bar, "h-1 w-12")} />
        <span className={cn(bar, "h-1 w-16")} />
        <span className={cn(bar, "h-1 w-10")} />
      </div>
    </div>
  ),
  credencial: (
    <div className="grid h-full place-items-center p-2">
      <div className="flex h-full w-11 flex-col items-center overflow-hidden rounded-md bg-(--pf-surface)">
        <span className="h-3 w-full bg-(--pf-accent)" />
        <span className="-mt-1.5 size-3 rounded-full bg-(--pf-ink)/40 ring-2 ring-(--pf-surface)" />
        <span className={cn(bar, "mt-1.5 h-1 w-7")} />
        <span className={cn(bar, "mt-1 h-1 w-5")} />
      </div>
    </div>
  ),
  caso: (
    <div className="flex h-full flex-col gap-1.5 p-3">
      <div className="flex flex-1 gap-1.5">
        <div className="flex flex-1 flex-col justify-end gap-1">
          <span className={cn(bar, "h-2 w-full rounded-sm bg-(--pf-ink)/70")} />
          <span className={cn(bar, "h-2 w-3/4 rounded-sm bg-(--pf-ink)/70")} />
        </div>
        <span className="w-8 rounded bg-(--pf-accent)" />
      </div>
      <div className="flex gap-1.5">
        <span className={cn(bar, "h-1 flex-1")} />
        <span className={cn(bar, "h-1 flex-1")} />
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

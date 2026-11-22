"use client"

import {
  DatePicker as DatePickerPrimitive,
  DatePickerContent,
  DatePickerInput,
  DatePickerTrigger,
} from "@ui-sdk/react/date-picker"
import { CalendarDays } from "lucide-react"
import type { ComponentProps } from "react"
import { useIsClient } from "@/lib/use-is-client"
import { cn } from "@/lib/utils"
import { CalendarBody } from "./calendar"
import { Skeleton } from "./skeleton"

function DatePicker({ className, ...props }: ComponentProps<typeof DatePickerPrimitive>) {
  // ui-sdk renders aria-describedby on the server only for a picker in a Field, so it mounts on the client.
  const isClient = useIsClient()
  if (!isClient) return <Skeleton className="h-10 w-full rounded-[14px]" />
  return (
    <DatePickerPrimitive {...props}>
        <div
          className={cn(
            "control flex h-10 w-full items-center gap-1 pr-1 pl-3.5 has-[[data-slot=date-picker-trigger]:focus-visible]:border-accent-strong",
            className,
          )}
        >
          <DatePickerInput placeholder="dd/mm/aaaa" className="h-full min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none placeholder:text-ink-muted" />
          <DatePickerTrigger
            aria-label="Abrir calendario"
            className="pressable focus-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-muted hover:bg-fill-soft hover:text-ink"
          >
            <CalendarDays aria-hidden className="size-4" />
          </DatePickerTrigger>
        </div>
        <DatePickerContent sideOffset={8} className="popup rounded-[22px] border-0 p-4 outline-none">
          <CalendarBody />
        </DatePickerContent>
    </DatePickerPrimitive>
  )
}

export { DatePicker }
export { DatePickerHint, DatePickerClear, DatePickerPreset } from "@ui-sdk/react/date-picker"

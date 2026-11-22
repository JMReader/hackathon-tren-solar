"use client"

import {
  Calendar as CalendarPrimitive,
  CalendarDay as CalendarDayPrimitive,
  CalendarGrid,
  CalendarHeading as CalendarHeadingPrimitive,
  CalendarNext as CalendarNextPrimitive,
  CalendarPrevious as CalendarPreviousPrimitive,
  CalendarWeekday as CalendarWeekdayPrimitive,
  CalendarWeekdays,
  CalendarWeeks,
} from "@ui-sdk/react/calendar"
import { Suspense, type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

const navButton =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-fill-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-disabled:opacity-40"

function Calendar({
  className,
  ...props
}: ComponentProps<typeof CalendarPrimitive>) {
  return (
    <Suspense fallback={<Skeleton className="h-[320px] w-[300px]" />}>
      <CalendarPrimitive
      className={cn(
        "w-fit rounded-2xl border border-border-card bg-paper p-4 shadow-ambient",
        className,
      )}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between">
        <CalendarPreviousPrimitive className={navButton} />
        <CalendarHeadingPrimitive className="font-display text-sm font-semibold text-ink" />
        <CalendarNextPrimitive className={navButton} />
      </div>
      <CalendarGrid>
        <CalendarWeekdays>
          {(index) => (
            <CalendarWeekdayPrimitive
              index={index}
              className="flex h-8 w-9 items-center justify-center text-[11px] font-medium text-ink-faint uppercase"
            />
          )}
        </CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => (
            <CalendarDayPrimitive
              value={cell.date}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm text-ink transition-colors select-none hover:bg-fill-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lime data-disabled:opacity-40 data-outside:text-ink-faint/60 data-range-end:bg-accent data-range-end:text-inverse data-range-middle:bg-accent-soft data-range-start:bg-accent data-range-start:text-inverse data-selected:bg-accent data-selected:text-inverse data-today:font-semibold data-today:ring-1 data-today:ring-lime data-unavailable:text-ink-faint/50 data-unavailable:line-through"
            />
          )}
        </CalendarWeeks>
      </CalendarGrid>
      </CalendarPrimitive>
    </Suspense>
  )
}

export { Calendar }

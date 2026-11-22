"use client"

import {
  Calendar as CalendarPrimitive,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "@ui-sdk/react/calendar"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Suspense, type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

const navButton =
  "pressable focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-fill-soft hover:text-ink data-disabled:pointer-events-none data-disabled:opacity-35"

const dayFace =
  "relative mx-auto flex size-9 items-center justify-center rounded-full text-[13px] tabular-nums text-ink transition-[background-color,color,scale] duration-150 ease-out " +
  "group-hover/day:bg-fill-soft group-active/day:scale-95 " +
  "group-data-outside/day:text-ink-faint " +
  "group-data-unavailable/day:text-ink-faint group-data-unavailable/day:line-through " +
  "group-data-disabled/day:opacity-40 group-data-disabled/day:group-hover/day:bg-transparent " +
  "group-data-range-middle/day:rounded-none group-data-range-middle/day:bg-sunken " +
  "group-data-selected/day:bg-ink group-data-selected/day:text-inverse group-data-selected/day:group-hover/day:bg-ink " +
  "group-data-range-middle/day:group-data-selected/day:bg-sunken group-data-range-middle/day:group-data-selected/day:text-ink " +
  "group-focus-visible/day:outline-2 group-focus-visible/day:outline-offset-1 group-focus-visible/day:outline-accent-strong"

function CalendarBody() {
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <CalendarPrevious aria-label="Mes anterior" className={navButton}>
          <ChevronLeft aria-hidden className="size-4" />
        </CalendarPrevious>
        <CalendarHeading className="font-display text-[15px] font-medium tracking-display text-ink first-letter:uppercase" />
        <CalendarNext aria-label="Mes siguiente" className={navButton}>
          <ChevronRight aria-hidden className="size-4" />
        </CalendarNext>
      </div>
      <CalendarGrid className="border-separate border-spacing-y-0.5">
        <CalendarWeekdays>
          {(index) => (
            <CalendarWeekday
              index={index}
              className="h-8 w-10 text-center align-middle text-[11px] font-medium text-ink-muted uppercase"
            />
          )}
        </CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => (
            <CalendarDay
              value={cell.date}
              className="group/day h-9 w-10 cursor-pointer p-0 text-center align-middle outline-none data-disabled:cursor-not-allowed"
            >
              {(state) => (
                <span className={dayFace}>
                  {state.label}
                  {state.today && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 size-1 rounded-full bg-accent group-data-selected/day:bg-inverse"
                    />
                  )}
                </span>
              )}
            </CalendarDay>
          )}
        </CalendarWeeks>
      </CalendarGrid>
    </>
  )
}

function Calendar({ className, ...props }: ComponentProps<typeof CalendarPrimitive>) {
  return (
    <Suspense fallback={<Skeleton className="h-[318px] w-[312px] rounded-[22px]" />}>
      <CalendarPrimitive
        className={cn("w-fit rounded-[22px] bg-paper p-4 shadow-raised", className)}
        {...props}
      >
        <CalendarBody />
      </CalendarPrimitive>
    </Suspense>
  )
}

export { Calendar, CalendarBody }

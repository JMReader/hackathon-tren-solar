"use client"

import {
  CalendarDay as CalendarDayPrimitive,
  CalendarGrid,
  CalendarHeading as CalendarHeadingPrimitive,
  CalendarNext as CalendarNextPrimitive,
  CalendarPrevious as CalendarPreviousPrimitive,
  CalendarWeekday as CalendarWeekdayPrimitive,
  CalendarWeekdays,
  CalendarWeeks,
  DatePicker,
  DatePickerContent as DatePickerContentPrimitive,
  DatePickerInput as DatePickerInputPrimitive,
  DatePickerTrigger as DatePickerTriggerPrimitive,
} from "@ui-sdk/react/date-picker"
import { Suspense, type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { inputClasses } from "./input"
import { Skeleton } from "./skeleton"

const navButton =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-fill-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-disabled:opacity-40"

function DatePickerField({
  className,
  ...props
}: ComponentProps<typeof DatePicker>) {
  return (
    <Suspense fallback={<Skeleton className="h-11 w-full" />}>
      <DatePicker {...props}>
      <div className="flex items-center gap-2">
        <DatePickerInputPrimitive className={cn(inputClasses, className)} />
        <DatePickerTriggerPrimitive className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-card bg-paper text-ink-muted transition-colors hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime" />
      </div>
      <DatePickerContentPrimitive
        sideOffset={8}
        className="rounded-2xl border border-border-card bg-paper p-4 shadow-paper transition-[opacity,scale] duration-150 data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0"
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
      </DatePickerContentPrimitive>
      </DatePicker>
    </Suspense>
  )
}

export { DatePickerField as DatePicker }
export {
  DatePickerInput,
  DatePickerTrigger,
  DatePickerHint,
  DatePickerClear,
  DatePickerContent,
  DatePickerPreset,
} from "@ui-sdk/react/date-picker"

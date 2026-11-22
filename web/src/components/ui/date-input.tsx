import { DateInput as DateInputPrimitive } from "@ui-sdk/react/date-input"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function DateInput({ className, ...props }: ComponentProps<typeof DateInputPrimitive>) {
  return (
    <DateInputPrimitive
      className={cn(
        "control flex h-10 w-full items-center px-3.5 text-sm tabular-nums has-[:focus-visible]:border-accent-strong has-[:focus-visible]:shadow-[0_0_0_4px_rgb(255_92_10/0.16)] data-disabled:opacity-50",
        "[&_[data-slot=date-input-segment]]:rounded-[5px] [&_[data-slot=date-input-segment]]:px-0.5 [&_[data-slot=date-input-segment]]:outline-none [&_[data-slot=date-input-segment][data-empty]]:text-ink-muted [&_[data-slot=date-input-segment]:focus]:bg-ink [&_[data-slot=date-input-segment]:focus]:text-inverse [&_[data-type=literal]]:px-0 [&_[data-type=literal]]:text-ink-faint",
        className,
      )}
      {...props}
    />
  )
}

export { DateInput }
export { DateInputSegment } from "@ui-sdk/react/date-input"

import { DateInput as DateInputPrimitive } from "@ui-sdk/react/date-input"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function DateInput({
  className,
  ...props
}: ComponentProps<typeof DateInputPrimitive>) {
  return (
    <DateInputPrimitive
      className={cn(
        "flex h-11 w-full items-center gap-1 rounded-xl border border-border-card bg-paper px-4 text-sm text-ink transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/12 data-disabled:opacity-50 [&_[data-slot=date-input-segment]]:rounded-sm [&_[data-slot=date-input-segment]]:px-0.5 [&_[data-slot=date-input-segment]]:outline-none [&_[data-slot=date-input-segment]]:focus-visible:bg-accent-soft",
        className,
      )}
      {...props}
    />
  )
}

export { DateInput }
export { DateInputSegment } from "@ui-sdk/react/date-input"

import { Textarea as TextareaPrimitive } from "@ui-sdk/react/textarea"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}: ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      className={cn(
        "min-h-28 w-full rounded-xl border border-border-card bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/12 data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

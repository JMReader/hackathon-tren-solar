import {
  Toggle as TogglePrimitive,
  ToggleGroup as ToggleGroupPrimitive,
} from "@ui-sdk/react/toggle"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border-card bg-paper px-4 text-sm font-medium text-ink-muted transition-colors select-none hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-disabled:opacity-50 data-pressed:border-accent data-pressed:bg-accent-soft data-pressed:text-accent-deep",
        className,
      )}
      {...props}
    />
  )
}

function ToggleGroup({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive>) {
  return (
    <ToggleGroupPrimitive
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    />
  )
}

export { Toggle, ToggleGroup }
export { ToggleIcon } from "@ui-sdk/react/toggle"

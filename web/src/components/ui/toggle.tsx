import { Toggle as TogglePrimitive, ToggleGroup as ToggleGroupPrimitive } from "@ui-sdk/react/toggle"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      className={cn(
        "pressable focus-ring inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium bg-sunken text-ink-muted select-none hover:text-ink data-pressed:bg-accent-strong data-pressed:text-white data-disabled:cursor-not-allowed data-disabled:opacity-45 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive>) {
  return <ToggleGroupPrimitive className={cn("inline-flex items-center gap-1.5", className)} {...props} />
}

export { Toggle, ToggleGroup }
export { ToggleIcon } from "@ui-sdk/react/toggle"

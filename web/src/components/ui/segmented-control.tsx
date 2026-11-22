import {
  SegmentedControl as SegmentedControlPrimitive,
  SegmentedControlIndicator,
  SegmentedControlItem as SegmentedControlItemPrimitive,
} from "@ui-sdk/react/segmented-control"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

function SegmentedControl({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof SegmentedControlPrimitive>, "children"> & { children?: ReactNode }) {
  return (
    <SegmentedControlPrimitive
      className={cn("relative isolate inline-flex items-center gap-0.5 rounded-full bg-sunken p-1", className)}
      {...props}
    >
      {children}
      <SegmentedControlIndicator className="rounded-full bg-paper shadow-thumb" />
    </SegmentedControlPrimitive>
  )
}

function SegmentedControlItem({
  className,
  ...props
}: ComponentProps<typeof SegmentedControlItemPrimitive>) {
  return (
    <SegmentedControlItemPrimitive
      className={cn(
        "focus-ring relative z-10 inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap text-ink-muted transition-colors duration-200 ease-out select-none hover:text-ink data-checked:text-ink data-disabled:cursor-not-allowed data-disabled:opacity-45 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }

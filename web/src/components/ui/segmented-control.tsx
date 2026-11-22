import {
  SegmentedControl,
  SegmentedControlIndicator as SegmentedControlIndicatorPrimitive,
  SegmentedControlItem as SegmentedControlItemPrimitive,
} from "@ui-sdk/react/segmented-control"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function SegmentedControlRoot({
  className,
  ...props
}: ComponentProps<typeof SegmentedControl>) {
  return (
    <SegmentedControl
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full bg-fill-soft p-1",
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  ...props
}: ComponentProps<typeof SegmentedControlItemPrimitive>) {
  return (
    <SegmentedControlItemPrimitive
      className={cn(
        "relative z-10 inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium text-ink-muted transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-checked:text-ink data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlIndicator({
  className,
  ...props
}: ComponentProps<typeof SegmentedControlIndicatorPrimitive>) {
  return (
    <SegmentedControlIndicatorPrimitive
      className={cn("absolute rounded-full bg-paper shadow-ambient", className)}
      {...props}
    />
  )
}

export {
  SegmentedControlRoot as SegmentedControl,
  SegmentedControlItem,
  SegmentedControlIndicator,
}

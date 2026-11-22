import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
  ProgressLabel as ProgressLabelPrimitive,
  ProgressTrack as ProgressTrackPrimitive,
  ProgressValue as ProgressValuePrimitive,
} from "@ui-sdk/react/progress"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Progress({
  className,
  ...props
}: ComponentProps<typeof ProgressPrimitive>) {
  return (
    <ProgressPrimitive
      className={cn("flex w-full flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function ProgressTrack({
  className,
  ...props
}: ComponentProps<typeof ProgressTrackPrimitive>) {
  return (
    <ProgressTrackPrimitive
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ComponentProps<typeof ProgressIndicatorPrimitive>) {
  return (
    <ProgressIndicatorPrimitive
      className={cn("h-full rounded-full bg-accent transition-[width] duration-300", className)}
      {...props}
    />
  )
}

function ProgressLabel({
  className,
  ...props
}: ComponentProps<typeof ProgressLabelPrimitive>) {
  return (
    <ProgressLabelPrimitive
      className={cn("text-xs font-medium text-ink-muted", className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  ...props
}: ComponentProps<typeof ProgressValuePrimitive>) {
  return (
    <ProgressValuePrimitive
      className={cn("text-xs font-medium text-ink", className)}
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }

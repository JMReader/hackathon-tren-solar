import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
  ProgressLabel as ProgressLabelPrimitive,
  ProgressTrack as ProgressTrackPrimitive,
  ProgressValue as ProgressValuePrimitive,
} from "@ui-sdk/react/progress"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Progress({ className, ...props }: ComponentProps<typeof ProgressPrimitive>) {
  return <ProgressPrimitive className={cn("flex w-full flex-col gap-2", className)} {...props} />
}

function ProgressTrack({ className, ...props }: ComponentProps<typeof ProgressTrackPrimitive>) {
  return (
    <ProgressTrackPrimitive
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: ComponentProps<typeof ProgressIndicatorPrimitive>) {
  return (
    <ProgressIndicatorPrimitive
      className={cn(
        "absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-500 ease-out data-indeterminate:w-2/5! data-indeterminate:animate-indeterminate motion-reduce:data-indeterminate:animate-none",
        className,
      )}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ComponentProps<typeof ProgressLabelPrimitive>) {
  return <ProgressLabelPrimitive className={cn("text-[13px] font-medium text-ink", className)} {...props} />
}

function ProgressValue({ className, ...props }: ComponentProps<typeof ProgressValuePrimitive>) {
  return <ProgressValuePrimitive className={cn("text-[13px] text-ink-muted tabular-nums", className)} {...props} />
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }

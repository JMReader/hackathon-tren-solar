import {
  Slider as SliderPrimitive,
  SliderControl as SliderControlPrimitive,
  SliderIndicator as SliderIndicatorPrimitive,
  SliderThumb as SliderThumbPrimitive,
  SliderTrack as SliderTrackPrimitive,
} from "@ui-sdk/react/slider"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

function Slider({
  className,
  children,
  "aria-label": ariaLabel,
  ...props
}: Omit<ComponentProps<typeof SliderPrimitive>, "children"> & { children?: ReactNode }) {
  return (
    <SliderPrimitive className={cn("group/slider w-full data-disabled:opacity-45", className)} {...props}>
      {children ?? (
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label={ariaLabel} />
          </SliderTrack>
        </SliderControl>
      )}
    </SliderPrimitive>
  )
}

function SliderControl({ className, ...props }: ComponentProps<typeof SliderControlPrimitive>) {
  return (
    <SliderControlPrimitive
      className={cn("flex h-5 w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function SliderTrack({ className, ...props }: ComponentProps<typeof SliderTrackPrimitive>) {
  return <SliderTrackPrimitive className={cn("relative h-1.5 w-full rounded-full bg-sunken", className)} {...props} />
}

function SliderIndicator({ className, ...props }: ComponentProps<typeof SliderIndicatorPrimitive>) {
  return <SliderIndicatorPrimitive className={cn("h-full rounded-full bg-ink", className)} {...props} />
}

function SliderThumb({ className, ...props }: ComponentProps<typeof SliderThumbPrimitive>) {
  return (
    <SliderThumbPrimitive
      className={cn(
        "size-4 rounded-full bg-paper shadow-thumb ring-1 ring-hairline transition-[scale] duration-150 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-strong group-data-dragging/slider:scale-110",
        className,
      )}
      {...props}
    />
  )
}

export { Slider, SliderControl, SliderTrack, SliderIndicator, SliderThumb }
export { SliderValue } from "@ui-sdk/react/slider"

import {
  Popover,
  PopoverContent as PopoverContentPrimitive,
  PopoverDescription as PopoverDescriptionPrimitive,
  PopoverTitle as PopoverTitlePrimitive,
} from "@ui-sdk/react/popover"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function PopoverContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof PopoverContentPrimitive>) {
  return (
    <PopoverContentPrimitive
      sideOffset={sideOffset}
      className={cn("popup w-72 rounded-[18px] border-0 p-4 text-ink outline-none", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: ComponentProps<typeof PopoverTitlePrimitive>) {
  return <PopoverTitlePrimitive className={cn("text-sm font-semibold text-ink", className)} {...props} />
}

function PopoverDescription({ className, ...props }: ComponentProps<typeof PopoverDescriptionPrimitive>) {
  return (
    <PopoverDescriptionPrimitive className={cn("mt-1 text-[13px] leading-relaxed text-ink-muted", className)} {...props} />
  )
}

export { Popover, PopoverContent, PopoverTitle, PopoverDescription }
export { PopoverTrigger, PopoverClose, PopoverArrow, PopoverShortcut, createPopoverController } from "@ui-sdk/react/popover"

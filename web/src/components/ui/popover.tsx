import {
  Popover,
  PopoverArrow as PopoverArrowPrimitive,
  PopoverContent as PopoverContentPrimitive,
  PopoverDescription as PopoverDescriptionPrimitive,
  PopoverTitle as PopoverTitlePrimitive,
} from "@ui-sdk/react/popover"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function PopoverContent({
  className,
  ...props
}: ComponentProps<typeof PopoverContentPrimitive>) {
  return (
    <PopoverContentPrimitive
      className={cn(
        "w-72 rounded-2xl border border-border-card bg-paper p-4 shadow-paper transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function PopoverTitle({
  className,
  ...props
}: ComponentProps<typeof PopoverTitlePrimitive>) {
  return (
    <PopoverTitlePrimitive
      className={cn("text-sm font-semibold text-ink", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: ComponentProps<typeof PopoverDescriptionPrimitive>) {
  return (
    <PopoverDescriptionPrimitive
      className={cn("mt-1 text-sm text-ink-muted", className)}
      {...props}
    />
  )
}

function PopoverArrow({
  className,
  ...props
}: ComponentProps<typeof PopoverArrowPrimitive>) {
  return (
    <PopoverArrowPrimitive
      className={cn("fill-paper stroke-border-card", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
  PopoverArrow,
}
export {
  PopoverTrigger,
  PopoverClose,
  PopoverShortcut,
  createPopoverController,
} from "@ui-sdk/react/popover"

import {
  Tooltip,
  TooltipArrow as TooltipArrowPrimitive,
  TooltipContent as TooltipContentPrimitive,
} from "@ui-sdk/react/tooltip"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function TooltipContent({
  className,
  ...props
}: ComponentProps<typeof TooltipContentPrimitive>) {
  return (
    <TooltipContentPrimitive
      className={cn(
        "rounded-lg bg-[#363635] px-2.5 py-1.5 text-xs font-medium text-inverse shadow-paper transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function TooltipArrow({
  className,
  ...props
}: ComponentProps<typeof TooltipArrowPrimitive>) {
  return (
    <TooltipArrowPrimitive className={cn("fill-[#363635]", className)} {...props} />
  )
}

export { Tooltip, TooltipContent, TooltipArrow }
export { TooltipTrigger, TooltipShortcut } from "@ui-sdk/react/tooltip"

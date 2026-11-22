import { Tooltip, TooltipContent as TooltipContentPrimitive } from "@ui-sdk/react/tooltip"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof TooltipContentPrimitive>) {
  return (
    <TooltipContentPrimitive
      sideOffset={sideOffset}
      className={cn(
        "origin-(--transform-origin) rounded-lg border-0 bg-tooltip px-2.5 py-1.5 text-xs font-medium text-inverse shadow-[0_4px_12px_rgb(12_12_22/0.2)] transition-[opacity,scale] duration-125 ease-out data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-100 data-instant:duration-0 motion-reduce:transition-opacity",
        className,
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipContent }
export { TooltipTrigger, TooltipArrow, TooltipShortcut } from "@ui-sdk/react/tooltip"

import { Label as LabelPrimitive } from "@ui-sdk/react/label"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive>) {
  return (
    <LabelPrimitive
      className={cn("text-sm font-medium text-ink", className)}
      {...props}
    />
  )
}

export { Label }

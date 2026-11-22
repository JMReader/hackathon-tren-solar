import { Textarea as TextareaPrimitive } from "@ui-sdk/react/textarea"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      className={cn(
        "control min-h-24 w-full resize-y px-3.5 py-2.5 text-sm leading-relaxed data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

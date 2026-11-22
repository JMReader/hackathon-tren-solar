import {
  Checkbox as CheckboxPrimitive,
  CheckboxGroup,
  CheckboxIndicator,
} from "@ui-sdk/react/checkbox"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive>) {
  return (
    <CheckboxPrimitive
      className={cn(
        "inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#adada4] bg-paper text-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-checked:border-accent data-checked:bg-accent data-checked:text-inverse data-disabled:cursor-default data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Checkbox, CheckboxGroup, CheckboxIndicator }

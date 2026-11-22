import {
  Checkbox as CheckboxPrimitive,
  CheckboxGroup,
  CheckboxIndicator as CheckboxIndicatorPrimitive,
} from "@ui-sdk/react/checkbox"
import { Check, Minus } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Checkbox({ className, children, ...props }: ComponentProps<typeof CheckboxPrimitive>) {
  return (
    <CheckboxPrimitive
      className={cn(
        "pressable focus-ring group/checkbox inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-control-edge bg-paper text-inverse data-checked:border-ink data-checked:bg-ink data-indeterminate:border-ink data-indeterminate:bg-ink data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children ?? <CheckboxIndicator />}
    </CheckboxPrimitive>
  )
}

function CheckboxIndicator({ className, ...props }: ComponentProps<typeof CheckboxIndicatorPrimitive>) {
  return (
    <CheckboxIndicatorPrimitive
      className={cn(
        "flex items-center justify-center transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-75 data-ending-style:opacity-0 data-starting-style:scale-75 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    >
      <Check strokeWidth={3} className="size-3 group-data-indeterminate/checkbox:hidden" />
      <Minus strokeWidth={3} className="hidden size-3 group-data-indeterminate/checkbox:block" />
    </CheckboxIndicatorPrimitive>
  )
}

export { Checkbox, CheckboxGroup, CheckboxIndicator }

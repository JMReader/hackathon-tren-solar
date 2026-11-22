import {
  Radio as RadioPrimitive,
  RadioGroup as RadioGroupPrimitive,
  RadioIndicator as RadioIndicatorPrimitive,
} from "@ui-sdk/react/radio"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive>) {
  return <RadioGroupPrimitive className={cn("flex flex-col gap-3", className)} {...props} />
}

function Radio({ className, children, ...props }: ComponentProps<typeof RadioPrimitive>) {
  return (
    <RadioPrimitive
      className={cn(
        "pressable focus-ring inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-control-edge bg-paper data-checked:border-ink data-checked:bg-ink data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children ?? <RadioIndicator />}
    </RadioPrimitive>
  )
}

function RadioIndicator({ className, ...props }: ComponentProps<typeof RadioIndicatorPrimitive>) {
  return (
    <RadioIndicatorPrimitive
      className={cn(
        "size-[7px] rounded-full bg-inverse transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-50 data-ending-style:opacity-0 data-starting-style:scale-50 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

export { RadioGroup, Radio, RadioIndicator }

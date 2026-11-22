import {
  Radio as RadioPrimitive,
  RadioGroup as RadioGroupPrimitive,
  RadioIndicator,
} from "@ui-sdk/react/radio"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive>) {
  return (
    <RadioGroupPrimitive
      className={cn("flex flex-col gap-2.5", className)}
      {...props}
    />
  )
}

function Radio({ className, ...props }: ComponentProps<typeof RadioPrimitive>) {
  return (
    <RadioPrimitive
      className={cn(
        "inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#adada4] bg-paper transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-checked:border-accent data-disabled:cursor-default data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function RadioDot({
  className,
  ...props
}: ComponentProps<typeof RadioIndicator>) {
  return (
    <RadioIndicator
      className={cn("h-2.5 w-2.5 rounded-full data-checked:bg-accent", className)}
      {...props}
    />
  )
}

export { RadioGroup, Radio, RadioDot as RadioIndicator }

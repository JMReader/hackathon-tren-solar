import {
  Input as InputPrimitive,
  InputClear,
  InputGroup as InputGroupPrimitive,
} from "@ui-sdk/react/input"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const inputClasses =
  "h-11 w-full rounded-xl border border-border-card bg-paper px-4 text-sm text-ink placeholder:text-ink-faint transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/12 data-disabled:opacity-50"

function Input({ className, ...props }: ComponentProps<typeof InputPrimitive>) {
  return <InputPrimitive className={cn(inputClasses, className)} {...props} />
}

function InputGroup({
  className,
  ...props
}: ComponentProps<typeof InputGroupPrimitive>) {
  return (
    <InputGroupPrimitive
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border-card bg-paper px-3 transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/12 [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:px-1 [&_[data-slot=input]]:ring-0 [&_[data-slot=input]]:focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  )
}

export { Input, InputGroup, InputClear, inputClasses }

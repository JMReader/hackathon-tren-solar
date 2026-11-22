import {
  Input as InputPrimitive,
  InputClear as InputClearPrimitive,
  InputGroup as InputGroupPrimitive,
} from "@ui-sdk/react/input"
import { X } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const inputClasses =
  "control h-10 w-full min-w-0 px-3.5 text-sm data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:bg-sunken"

function Input({ className, ...props }: ComponentProps<typeof InputPrimitive>) {
  return <InputPrimitive className={cn(inputClasses, className)} {...props} />
}

function InputGroup({ className, ...props }: ComponentProps<typeof InputGroupPrimitive>) {
  return (
    <InputGroupPrimitive
      className={cn(
        "control flex h-10 w-full items-center gap-2 px-3 text-ink-muted [&_svg]:size-4 [&_svg]:shrink-0 [&>[data-slot=input]]:h-full [&>[data-slot=input]]:flex-1 [&>[data-slot=input]]:border-0 [&>[data-slot=input]]:bg-transparent [&>[data-slot=input]]:px-0 [&>[data-slot=input]]:shadow-none",
        className,
      )}
      {...props}
    />
  )
}

function InputClear({ className, children, ...props }: ComponentProps<typeof InputClearPrimitive>) {
  return (
    <InputClearPrimitive
      aria-label="Borrar"
      className={cn(
        "pressable focus-ring -mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-fill-soft hover:text-ink",
        className,
      )}
      {...props}
    >
      {children ?? <X className="size-3.5" />}
    </InputClearPrimitive>
  )
}

export { Input, InputGroup, InputClear, inputClasses }

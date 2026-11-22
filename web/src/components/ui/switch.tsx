import {
  Switch as SwitchPrimitive,
  SwitchThumb,
} from "@ui-sdk/react/switch"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive>) {
  return (
    <SwitchPrimitive
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[#d5d5d2] p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-checked:bg-accent data-disabled:cursor-default data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Switch, SwitchThumb }

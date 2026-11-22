import { Switch as SwitchPrimitive, SwitchThumb as SwitchThumbPrimitive } from "@ui-sdk/react/switch"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Switch({ className, children, ...props }: ComponentProps<typeof SwitchPrimitive>) {
  return (
    <SwitchPrimitive
      className={cn(
        "focus-ring group/switch inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full bg-control-edge p-[2px] transition-colors duration-200 ease-out data-checked:bg-ink data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </SwitchPrimitive>
  )
}

function SwitchThumb({ className, ...props }: ComponentProps<typeof SwitchThumbPrimitive>) {
  return (
    <SwitchThumbPrimitive
      className={cn(
        "block size-[18px] rounded-full bg-paper shadow-thumb transition-[translate,width] duration-200 ease-out group-active/switch:w-[22px] data-checked:translate-x-4 group-active/switch:data-checked:translate-x-3 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  )
}

export { Switch, SwitchThumb }

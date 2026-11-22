import {
  Select,
  SelectContent as SelectContentPrimitive,
  SelectGroupLabel as SelectGroupLabelPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectItemIndicator,
  SelectItemText,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
} from "@ui-sdk/react/select"
import { Check, ChevronDown } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

function SelectTrigger({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof SelectTriggerPrimitive>, "children"> & { children?: ReactNode }) {
  return (
    <SelectTriggerPrimitive
      className={cn(
        "control focus-ring group/trigger flex h-10 w-full cursor-pointer items-center justify-between gap-2 px-3.5 text-left text-sm data-disabled:cursor-not-allowed data-disabled:opacity-50 data-placeholder:text-ink-muted",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronDown
        aria-hidden
        className="size-4 shrink-0 text-ink-muted transition-[rotate] duration-200 ease-out group-data-open/trigger:rotate-180"
      />
    </SelectTriggerPrimitive>
  )
}

function SelectContent({ className, ...props }: ComponentProps<typeof SelectContentPrimitive>) {
  return (
    <SelectContentPrimitive
      sideOffset={6}
      className={cn(
        "popup max-h-[min(20rem,var(--available-height))] min-w-(--anchor-width) overflow-y-auto overscroll-contain rounded-xl border-0 p-1 outline-none",
        className,
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof SelectItemPrimitive>, "children"> & { children?: ReactNode }) {
  return (
    <SelectItemPrimitive
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm text-ink outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-45 data-highlighted:bg-fill-soft-hover",
        className,
      )}
      {...props}
    >
      <SelectItemText className="min-w-0 flex-1 truncate">{children}</SelectItemText>
      <SelectItemIndicator className="text-accent-strong">
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      </SelectItemIndicator>
    </SelectItemPrimitive>
  )
}

function SelectGroupLabel({ className, ...props }: ComponentProps<typeof SelectGroupLabelPrimitive>) {
  return (
    <SelectGroupLabelPrimitive
      className={cn("px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-ink-muted uppercase", className)}
      {...props}
    />
  )
}

function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectSeparatorPrimitive>) {
  return <SelectSeparatorPrimitive className={cn("-mx-1 my-1 h-px bg-divider", className)} {...props} />
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectGroupLabel, SelectSeparator }
export {
  SelectValue,
  SelectLabel,
  SelectClear,
  SelectGroup,
  SelectInput,
  SelectEmpty,
  SelectArrow,
} from "@ui-sdk/react/select"

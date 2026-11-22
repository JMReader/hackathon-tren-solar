import {
  Select,
  SelectContent as SelectContentPrimitive,
  SelectGroupLabel as SelectGroupLabelPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
} from "@ui-sdk/react/select"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function SelectTrigger({
  className,
  ...props
}: ComponentProps<typeof SelectTriggerPrimitive>) {
  return (
    <SelectTriggerPrimitive
      className={cn(
        "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border-card bg-paper px-4 text-sm text-ink transition-colors data-placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/12 data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function SelectContent({
  className,
  ...props
}: ComponentProps<typeof SelectContentPrimitive>) {
  return (
    <SelectContentPrimitive
      className={cn(
        "min-w-(--anchor-width) rounded-xl border border-border-card bg-paper p-1 shadow-paper transition-[opacity,scale] duration-150 data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  ...props
}: ComponentProps<typeof SelectItemPrimitive>) {
  return (
    <SelectItemPrimitive
      className={cn(
        "flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm text-ink outline-none data-disabled:opacity-50 data-highlighted:bg-fill-soft data-selected:font-medium",
        className,
      )}
      {...props}
    />
  )
}

function SelectGroupLabel({
  className,
  ...props
}: ComponentProps<typeof SelectGroupLabelPrimitive>) {
  return (
    <SelectGroupLabelPrimitive
      className={cn("px-3 pt-2 pb-1 text-xs font-medium text-ink-faint", className)}
      {...props}
    />
  )
}

function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectSeparatorPrimitive>) {
  return (
    <SelectSeparatorPrimitive
      className={cn("mx-1 my-1 h-px bg-border-divider", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroupLabel,
  SelectSeparator,
}
export {
  SelectValue,
  SelectLabel,
  SelectClear,
  SelectGroup,
  SelectInput,
  SelectEmpty,
  SelectItemText,
  SelectItemIndicator,
  SelectArrow,
} from "@ui-sdk/react/select"
export type { ComponentProps as SelectProps }

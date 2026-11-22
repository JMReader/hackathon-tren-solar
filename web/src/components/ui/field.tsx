import {
  Field as FieldPrimitive,
  FieldDescription as FieldDescriptionPrimitive,
  FieldError as FieldErrorPrimitive,
  FieldGroup as FieldGroupPrimitive,
  FieldLabel as FieldLabelPrimitive,
  FieldLegend as FieldLegendPrimitive,
  FieldSet as FieldSetPrimitive,
} from "@ui-sdk/react/field"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Field({ className, ...props }: ComponentProps<typeof FieldPrimitive>) {
  return <FieldPrimitive className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function FieldLabel({ className, ...props }: ComponentProps<typeof FieldLabelPrimitive>) {
  return (
    <FieldLabelPrimitive
      className={cn("text-[13px] font-medium text-ink data-disabled:opacity-50", className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: ComponentProps<typeof FieldDescriptionPrimitive>) {
  return (
    <FieldDescriptionPrimitive
      className={cn("max-w-[65ch] text-xs leading-relaxed text-ink-muted", className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: ComponentProps<typeof FieldErrorPrimitive>) {
  return (
    <FieldErrorPrimitive
      className={cn("text-xs font-medium text-danger", className)}
      {...props}
    />
  )
}

function FieldSet({ className, ...props }: ComponentProps<typeof FieldSetPrimitive>) {
  return <FieldSetPrimitive className={cn("flex flex-col gap-4", className)} {...props} />
}

function FieldLegend({ className, ...props }: ComponentProps<typeof FieldLegendPrimitive>) {
  return (
    <FieldLegendPrimitive
      className={cn("mb-1 font-display text-base font-semibold tracking-display", className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: ComponentProps<typeof FieldGroupPrimitive>) {
  return <FieldGroupPrimitive className={cn("flex flex-col gap-4", className)} {...props} />
}

export { Field, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend, FieldGroup }
export { FieldControl, useFieldControl } from "@ui-sdk/react/field"

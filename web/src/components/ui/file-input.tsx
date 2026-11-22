import {
  FileInput,
  FileInputDropzone as FileInputDropzonePrimitive,
  FileInputItem as FileInputItemPrimitive,
  FileInputItemRemove as FileInputItemRemovePrimitive,
  FileInputList as FileInputListPrimitive,
  FileInputTrigger as FileInputTriggerPrimitive,
} from "@ui-sdk/react/file-input"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function FileInputDropzone({
  className,
  ...props
}: ComponentProps<typeof FileInputDropzonePrimitive>) {
  return (
    <FileInputDropzonePrimitive
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-card bg-paper/60 px-6 py-10 text-center transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-dragging:border-accent data-dragging:bg-accent-softer",
        className,
      )}
      {...props}
    />
  )
}

function FileInputTrigger({
  className,
  ...props
}: ComponentProps<typeof FileInputTriggerPrimitive>) {
  return (
    <FileInputTriggerPrimitive
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-deep transition-colors hover:bg-lime/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
        className,
      )}
      {...props}
    />
  )
}

function FileInputList({
  className,
  ...props
}: ComponentProps<typeof FileInputListPrimitive>) {
  return (
    <FileInputListPrimitive
      className={cn("mt-3 flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function FileInputItem({
  className,
  ...props
}: ComponentProps<typeof FileInputItemPrimitive>) {
  return (
    <FileInputItemPrimitive
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border-card bg-paper px-4 py-3 text-sm text-ink",
        className,
      )}
      {...props}
    />
  )
}

function FileInputItemRemove({
  className,
  ...props
}: ComponentProps<typeof FileInputItemRemovePrimitive>) {
  return (
    <FileInputItemRemovePrimitive
      className={cn(
        "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-fill-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
        className,
      )}
      {...props}
    />
  )
}

export {
  FileInput,
  FileInputDropzone,
  FileInputTrigger,
  FileInputList,
  FileInputItem,
  FileInputItemRemove,
}
export { createFileInputController, formatFileSize } from "@ui-sdk/react/file-input"

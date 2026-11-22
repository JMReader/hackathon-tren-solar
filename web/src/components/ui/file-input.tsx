import {
  FileInput,
  FileInputDropzone as FileInputDropzonePrimitive,
  FileInputItem as FileInputItemPrimitive,
  FileInputItemRemove as FileInputItemRemovePrimitive,
  FileInputList as FileInputListPrimitive,
  FileInputTrigger as FileInputTriggerPrimitive,
} from "@ui-sdk/react/file-input"
import { X } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { buttonStyles } from "./button"

function FileInputDropzone({ className, ...props }: ComponentProps<typeof FileInputDropzonePrimitive>) {
  return (
    <FileInputDropzonePrimitive
      className={cn(
        "group/drop flex flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-dashed border-[#cfc5c2] bg-paper/70 px-6 py-10 text-center transition-[border-color,background-color,scale] duration-200 ease-out data-dragging:scale-[1.01] data-dragging:border-accent data-dragging:bg-accent-soft/60 data-drag-reject:border-danger data-drag-reject:bg-danger-soft",
        className,
      )}
      {...props}
    />
  )
}

function FileInputTrigger({ className, ...props }: ComponentProps<typeof FileInputTriggerPrimitive>) {
  return <FileInputTriggerPrimitive className={cn(buttonStyles({ variant: "dark", size: "sm" }), className)} {...props} />
}

function FileInputList({ className, ...props }: ComponentProps<typeof FileInputListPrimitive>) {
  return <FileInputListPrimitive className={cn("mt-3 flex flex-col gap-2 outline-none", className)} {...props} />
}

function FileInputItem({ className, ...props }: ComponentProps<typeof FileInputItemPrimitive>) {
  return (
    <FileInputItemPrimitive
      className={cn(
        "flex items-center gap-3 rounded-[14px] bg-paper px-3.5 py-2.5 text-sm text-ink shadow-raised outline-none transition-[opacity,translate] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-accent-strong data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function FileInputItemRemove({ className, children, ...props }: ComponentProps<typeof FileInputItemRemovePrimitive>) {
  return (
    <FileInputItemRemovePrimitive
      aria-label="Quitar archivo"
      className={cn(buttonStyles({ variant: "ghost", size: "icon-sm" }), "size-7 text-ink-muted", className)}
      {...props}
    >
      {children ?? <X aria-hidden className="!size-3.5" />}
    </FileInputItemRemovePrimitive>
  )
}

export { FileInput, FileInputDropzone, FileInputTrigger, FileInputList, FileInputItem, FileInputItemRemove }
export { createFileInputController, formatFileSize } from "@ui-sdk/react/file-input"

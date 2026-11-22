import {
  Dialog,
  DialogBackdrop as DialogBackdropPrimitive,
  DialogClose as DialogClosePrimitive,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
} from "@ui-sdk/react/dialog"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function DialogBackdrop({
  className,
  ...props
}: ComponentProps<typeof DialogBackdropPrimitive>) {
  return (
    <DialogBackdropPrimitive
      className={cn(
        "fixed inset-0 bg-ink/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogContentPrimitive>) {
  return (
    <DialogContentPrimitive
      className={cn(
        "w-full max-w-md rounded-2xl border border-border-card bg-paper p-6 shadow-elevated transition-[opacity,scale] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogTitlePrimitive>) {
  return (
    <DialogTitlePrimitive
      className={cn("font-display text-xl font-semibold text-ink", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogDescriptionPrimitive>) {
  return (
    <DialogDescriptionPrimitive
      className={cn("mt-1.5 text-sm text-ink-muted", className)}
      {...props}
    />
  )
}

function DialogClose({
  className,
  ...props
}: ComponentProps<typeof DialogClosePrimitive>) {
  return (
    <DialogClosePrimitive
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium text-ink transition-colors hover:bg-fill-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
export {
  DialogTrigger,
  DialogShortcut,
  createDialogController,
} from "@ui-sdk/react/dialog"

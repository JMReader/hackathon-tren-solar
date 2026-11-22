import {
  AlertDialog,
  AlertDialogBackdrop as AlertDialogBackdropPrimitive,
  AlertDialogClose as AlertDialogClosePrimitive,
  AlertDialogContent as AlertDialogContentPrimitive,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  AlertDialogTitle as AlertDialogTitlePrimitive,
} from "@ui-sdk/react/alert-dialog"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function AlertDialogBackdrop({
  className,
  ...props
}: ComponentProps<typeof AlertDialogBackdropPrimitive>) {
  return (
    <AlertDialogBackdropPrimitive
      className={cn(
        "fixed inset-0 bg-ink/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogContentPrimitive>) {
  return (
    <AlertDialogContentPrimitive
      className={cn(
        "w-full max-w-sm rounded-2xl border border-border-card bg-paper p-6 shadow-elevated transition-[opacity,scale] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogTitlePrimitive>) {
  return (
    <AlertDialogTitlePrimitive
      className={cn("font-display text-lg font-semibold text-ink", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogDescriptionPrimitive>) {
  return (
    <AlertDialogDescriptionPrimitive
      className={cn("mt-1.5 text-sm text-ink-muted", className)}
      {...props}
    />
  )
}

function AlertDialogClose({
  className,
  ...props
}: ComponentProps<typeof AlertDialogClosePrimitive>) {
  return (
    <AlertDialogClosePrimitive
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium text-ink transition-colors hover:bg-fill-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
        className,
      )}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
}
export {
  AlertDialogTrigger,
  AlertDialogShortcut,
  confirm,
  createConfirm,
  createAlertDialogController,
} from "@ui-sdk/react/alert-dialog"

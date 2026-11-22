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
import { buttonStyles } from "./button"
import { contentClasses } from "./dialog"

function AlertDialogBackdrop({ className, ...props }: ComponentProps<typeof AlertDialogBackdropPrimitive>) {
  return <AlertDialogBackdropPrimitive className={cn("backdrop", className)} {...props} />
}

function AlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogContentPrimitive>) {
  return (
    <AlertDialogContentPrimitive className={cn(contentClasses, "w-[min(25rem,calc(100%-2rem))]", className)} {...props} />
  )
}

function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogTitlePrimitive>) {
  return (
    <AlertDialogTitlePrimitive
      className={cn("font-display text-xl leading-tight font-normal tracking-display text-ink", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertDialogDescriptionPrimitive>) {
  return (
    <AlertDialogDescriptionPrimitive className={cn("text-sm leading-relaxed text-ink-muted", className)} {...props} />
  )
}

function AlertDialogClose({ className, ...props }: ComponentProps<typeof AlertDialogClosePrimitive>) {
  return (
    <AlertDialogClosePrimitive
      className={cn(buttonStyles({ variant: "ghost", size: "sm" }), className)}
      {...props}
    />
  )
}

export { AlertDialog, AlertDialogBackdrop, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogClose }
export {
  AlertDialogTrigger,
  AlertDialogShortcut,
  confirm,
  createConfirm,
  createAlertDialogController,
} from "@ui-sdk/react/alert-dialog"

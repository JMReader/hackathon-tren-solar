import {
  Dialog,
  DialogBackdrop as DialogBackdropPrimitive,
  DialogClose as DialogClosePrimitive,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
} from "@ui-sdk/react/dialog"
import { X } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { buttonStyles } from "./button"

const contentClasses =
  "modal fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100%-2rem))] flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-[22px] border-0 p-6 text-ink outline-none"

function DialogBackdrop({ className, ...props }: ComponentProps<typeof DialogBackdropPrimitive>) {
  return <DialogBackdropPrimitive className={cn("backdrop", className)} {...props} />
}

function DialogContent({ className, ...props }: ComponentProps<typeof DialogContentPrimitive>) {
  return <DialogContentPrimitive className={cn(contentClasses, className)} {...props} />
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogTitlePrimitive>) {
  return (
    <DialogTitlePrimitive
      className={cn("pr-8 font-display text-[22px] leading-tight font-normal tracking-display text-ink", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogDescriptionPrimitive>) {
  return (
    <DialogDescriptionPrimitive
      className={cn("max-w-[65ch] text-sm leading-relaxed text-ink-muted", className)}
      {...props}
    />
  )
}

function DialogClose({ className, ...props }: ComponentProps<typeof DialogClosePrimitive>) {
  return (
    <DialogClosePrimitive className={cn(buttonStyles({ variant: "ghost", size: "sm" }), className)} {...props} />
  )
}

function DialogDismiss({ className, ...props }: ComponentProps<typeof DialogClosePrimitive>) {
  return (
    <DialogClosePrimitive
      aria-label="Cerrar"
      className={cn(buttonStyles({ variant: "ghost", size: "icon-sm" }), "absolute top-4 right-4 text-ink-muted", className)}
      {...props}
    >
      <X aria-hidden />
    </DialogClosePrimitive>
  )
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex flex-wrap items-center justify-end gap-2", className)} {...props} />
}

export { Dialog, DialogBackdrop, DialogContent, DialogTitle, DialogDescription, DialogClose, DialogDismiss, DialogFooter, contentClasses }
export { DialogTrigger, DialogShortcut, createDialogController } from "@ui-sdk/react/dialog"

import {
  Drawer,
  DrawerBackdrop as DrawerBackdropPrimitive,
  DrawerClose as DrawerClosePrimitive,
  DrawerContent as DrawerContentPrimitive,
  DrawerDescription as DrawerDescriptionPrimitive,
  DrawerHandle as DrawerHandlePrimitive,
  DrawerTitle as DrawerTitlePrimitive,
} from "@ui-sdk/react/drawer"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { buttonStyles } from "./button"

function DrawerBackdrop({ className, ...props }: ComponentProps<typeof DrawerBackdropPrimitive>) {
  return <DrawerBackdropPrimitive className={cn("backdrop", className)} {...props} />
}

function DrawerContent({ className, ...props }: ComponentProps<typeof DrawerContentPrimitive>) {
  return (
    <DrawerContentPrimitive
      className={cn(
        "relative mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col gap-1.5 rounded-t-[28px] bg-paper px-6 pt-3 pb-8 text-ink shadow-modal outline-none [transition-timing-function:var(--ease-drawer)] after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-paper",
        className,
      )}
      {...props}
    />
  )
}

function DrawerHandle({ className, ...props }: ComponentProps<typeof DrawerHandlePrimitive>) {
  return (
    <DrawerHandlePrimitive
      aria-label="Ajustar tamaño"
      className={cn("mx-auto mb-3 block h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-sunken active:cursor-grabbing", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: ComponentProps<typeof DrawerTitlePrimitive>) {
  return (
    <DrawerTitlePrimitive
      className={cn("font-display text-[22px] leading-tight font-normal tracking-display text-ink", className)}
      {...props}
    />
  )
}

function DrawerDescription({ className, ...props }: ComponentProps<typeof DrawerDescriptionPrimitive>) {
  return <DrawerDescriptionPrimitive className={cn("text-sm leading-relaxed text-ink-muted", className)} {...props} />
}

function DrawerClose({ className, ...props }: ComponentProps<typeof DrawerClosePrimitive>) {
  return <DrawerClosePrimitive className={cn(buttonStyles({ variant: "ghost", size: "sm" }), className)} {...props} />
}

export { Drawer, DrawerBackdrop, DrawerContent, DrawerHandle, DrawerTitle, DrawerDescription, DrawerClose }
export { DrawerTrigger, DrawerOutlet, DrawerShortcut, createDrawerController } from "@ui-sdk/react/drawer"

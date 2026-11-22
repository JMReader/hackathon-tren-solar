import {
  Drawer,
  DrawerBackdrop as DrawerBackdropPrimitive,
  DrawerClose as DrawerClosePrimitive,
  DrawerContent as DrawerContentPrimitive,
  DrawerHandle as DrawerHandlePrimitive,
  DrawerTitle as DrawerTitlePrimitive,
  DrawerDescription as DrawerDescriptionPrimitive,
} from "@ui-sdk/react/drawer"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function DrawerBackdrop({
  className,
  ...props
}: ComponentProps<typeof DrawerBackdropPrimitive>) {
  return (
    <DrawerBackdropPrimitive
      className={cn(
        "fixed inset-0 bg-ink/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  ...props
}: ComponentProps<typeof DrawerContentPrimitive>) {
  return (
    <DrawerContentPrimitive
      className={cn(
        "rounded-t-3xl border border-border-card bg-paper px-6 pt-3 pb-8 shadow-elevated",
        className,
      )}
      {...props}
    />
  )
}

function DrawerHandle({
  className,
  ...props
}: ComponentProps<typeof DrawerHandlePrimitive>) {
  return (
    <DrawerHandlePrimitive
      className={cn(
        "mx-auto mb-4 block h-1.5 w-10 rounded-full bg-border-card",
        className,
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: ComponentProps<typeof DrawerTitlePrimitive>) {
  return (
    <DrawerTitlePrimitive
      className={cn("font-display text-xl font-semibold text-ink", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof DrawerDescriptionPrimitive>) {
  return (
    <DrawerDescriptionPrimitive
      className={cn("mt-1.5 text-sm text-ink-muted", className)}
      {...props}
    />
  )
}

function DrawerClose({
  className,
  ...props
}: ComponentProps<typeof DrawerClosePrimitive>) {
  return (
    <DrawerClosePrimitive
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium text-ink transition-colors hover:bg-fill-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
        className,
      )}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
}
export {
  DrawerTrigger,
  DrawerOutlet,
  DrawerShortcut,
  createDrawerController,
} from "@ui-sdk/react/drawer"

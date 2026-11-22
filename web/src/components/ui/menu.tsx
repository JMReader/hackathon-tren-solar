import {
  Menu,
  MenuCheckboxItem as MenuCheckboxItemPrimitive,
  MenuContent as MenuContentPrimitive,
  MenuGroupLabel as MenuGroupLabelPrimitive,
  MenuItem as MenuItemPrimitive,
  MenuItemIndicator,
  MenuRadioItem as MenuRadioItemPrimitive,
  MenuSeparator as MenuSeparatorPrimitive,
} from "@ui-sdk/react/menu"
import { Check } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

const itemClasses =
  "flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm text-ink outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-45 data-highlighted:bg-fill-soft-hover data-destructive:text-danger [&_svg]:size-4 [&_svg]:shrink-0"

function MenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof MenuContentPrimitive>) {
  return (
    <MenuContentPrimitive
      sideOffset={sideOffset}
      className={cn(
        "popup max-h-(--available-height) min-w-44 overflow-y-auto overscroll-contain rounded-[14px] border-0 p-1 outline-none",
        className,
      )}
      {...props}
    />
  )
}

function MenuItem({ className, ...props }: ComponentProps<typeof MenuItemPrimitive>) {
  return <MenuItemPrimitive className={cn(itemClasses, className)} {...props} />
}

function CheckIndicator() {
  return (
    <MenuItemIndicator className="ml-auto text-accent-strong data-unchecked:invisible">
      <Check aria-hidden strokeWidth={2.5} />
    </MenuItemIndicator>
  )
}

function MenuRadioItem({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof MenuRadioItemPrimitive>, "children"> & { children?: ReactNode }) {
  return (
    <MenuRadioItemPrimitive className={cn(itemClasses, className)} {...props}>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <CheckIndicator />
    </MenuRadioItemPrimitive>
  )
}

function MenuCheckboxItem({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof MenuCheckboxItemPrimitive>, "children"> & { children?: ReactNode }) {
  return (
    <MenuCheckboxItemPrimitive className={cn(itemClasses, className)} {...props}>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <CheckIndicator />
    </MenuCheckboxItemPrimitive>
  )
}

function MenuGroupLabel({ className, ...props }: ComponentProps<typeof MenuGroupLabelPrimitive>) {
  return (
    <MenuGroupLabelPrimitive
      className={cn("px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase", className)}
      {...props}
    />
  )
}

function MenuSeparator({ className, ...props }: ComponentProps<typeof MenuSeparatorPrimitive>) {
  return <MenuSeparatorPrimitive className={cn("-mx-1 my-1 h-px bg-divider", className)} {...props} />
}

export { Menu, MenuContent, MenuItem, MenuRadioItem, MenuCheckboxItem, MenuGroupLabel, MenuSeparator }
export { MenuTrigger, MenuRadioGroup, MenuGroup, MenuSub, MenuSubTrigger, MenuSubContent, MenuShortcut } from "@ui-sdk/react/menu"

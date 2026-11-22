import {
  Tabs,
  TabsList as TabsListPrimitive,
  TabsPanel as TabsPanelPrimitive,
  TabsTab as TabsTabPrimitive,
} from "@ui-sdk/react/tabs"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsListPrimitive>) {
  return (
    <TabsListPrimitive
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-fill-soft p-1",
        className,
      )}
      {...props}
    />
  )
}

function TabsTab({
  className,
  ...props
}: ComponentProps<typeof TabsTabPrimitive>) {
  return (
    <TabsTabPrimitive
      className={cn(
        "inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium text-ink-muted transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-disabled:opacity-50 data-selected:bg-paper data-selected:text-ink data-selected:shadow-ambient",
        className,
      )}
      {...props}
    />
  )
}

function TabsPanel({
  className,
  ...props
}: ComponentProps<typeof TabsPanelPrimitive>) {
  return (
    <TabsPanelPrimitive className={cn("mt-4 outline-none", className)} {...props} />
  )
}

export { Tabs, TabsList, TabsTab, TabsPanel }
export { TabsIndicator, TabsTabIcon } from "@ui-sdk/react/tabs"

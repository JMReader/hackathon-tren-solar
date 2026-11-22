import {
  Tabs as TabsPrimitive,
  TabsIndicator,
  TabsList as TabsListPrimitive,
  TabsPanel as TabsPanelPrimitive,
  TabsTab as TabsTabPrimitive,
} from "@ui-sdk/react/tabs"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

type TabsVariant = "pill" | "underline"

function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive>) {
  return <TabsPrimitive className={cn("flex flex-col gap-4", className)} {...props} />
}

function TabsList({
  className,
  children,
  variant = "pill",
  ...props
}: Omit<ComponentProps<typeof TabsListPrimitive>, "children"> & { children?: ReactNode; variant?: TabsVariant }) {
  return (
    <TabsListPrimitive
      data-variant={variant}
      className={cn(
        "group/tabs relative isolate flex w-fit items-center",
        variant === "pill" && "gap-0.5 rounded-full bg-sunken p-1",
        variant === "underline" && "w-full gap-5 shadow-[inset_0_-1px_0_var(--color-divider)]",
        className,
      )}
      {...props}
    >
      {children}
      <TabsIndicator
        className={cn(
          variant === "pill" && "rounded-full bg-paper shadow-thumb",
          variant === "underline" && "top-auto bottom-0 h-0.5 rounded-full bg-ink [translate:var(--active-tab-left)_0]",
        )}
      />
    </TabsListPrimitive>
  )
}

function TabsTab({ className, ...props }: ComponentProps<typeof TabsTabPrimitive>) {
  return (
    <TabsTabPrimitive
      className={cn(
        "focus-ring relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-ink-muted transition-colors duration-200 ease-out select-none hover:text-ink data-disabled:cursor-not-allowed data-disabled:opacity-45 data-selected:text-ink [&_svg]:size-4",
        "group-data-[variant=pill]/tabs:h-8 group-data-[variant=pill]/tabs:rounded-full group-data-[variant=pill]/tabs:px-3.5",
        "group-data-[variant=underline]/tabs:h-10 group-data-[variant=underline]/tabs:rounded-sm",
        className,
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: ComponentProps<typeof TabsPanelPrimitive>) {
  return <TabsPanelPrimitive className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTab, TabsPanel }
export { TabsTabIcon } from "@ui-sdk/react/tabs"

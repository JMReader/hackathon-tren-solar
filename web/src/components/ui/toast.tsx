"use client"

import { ToastRegion } from "@ui-sdk/react/toast"
import { toast } from "@ui-sdk/react/toast"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Toaster({
  className,
  ...props
}: ComponentProps<typeof ToastRegion>) {
  return (
    <ToastRegion
      side="bottom"
      align="end"
      className={cn(
        "[&_[data-slot=toast]]:rounded-2xl [&_[data-slot=toast]]:border [&_[data-slot=toast]]:border-border-card [&_[data-slot=toast]]:bg-paper [&_[data-slot=toast]]:shadow-paper",
        className,
      )}
      {...props}
    />
  )
}

export { Toaster, toast }
export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  createToaster,
} from "@ui-sdk/react/toast"

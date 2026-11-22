"use client"

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  toast,
} from "@ui-sdk/react/toast"
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const icons: Record<string, ReactNode> = {
  success: <CircleCheck className="text-[#2f7d4f]" />,
  error: <CircleAlert className="text-danger" />,
  warning: <TriangleAlert className="text-[#b26b00]" />,
  info: <Info className="text-ink-muted" />,
  loading: <Spinner className="text-ink-muted" />,
}

function Toaster({ className, ...props }: Omit<ComponentProps<typeof ToastRegion>, "children">) {
  return (
    <ToastRegion side="bottom" align="end" aria-label="Notificaciones" className={cn(className)} {...props}>
      {(item) => (
        <Toast
          render={(toastProps, state) => (
            <li {...toastProps} inert={state.leaving || (!state.expanded && state.index > 0) || undefined} />
          )}
          className="flex items-start gap-3 rounded-[18px] bg-paper px-4 py-3.5 text-ink shadow-popover"
        >
          {icons[item.type ?? ""] && (
            <span className="mt-px shrink-0 [&_svg]:size-[18px]">{icons[item.type ?? ""]}</span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ToastTitle className="text-sm font-semibold text-ink" />
            <ToastDescription className="text-[13px] leading-snug text-ink-muted" />
          </div>
          <ToastAction className="pressable focus-ring h-7 shrink-0 cursor-pointer rounded-full bg-ink px-3 text-xs font-semibold text-inverse hover:bg-ink-strong" />
          <ToastClose
            aria-label="Cerrar"
            className="pressable focus-ring -mt-0.5 -mr-1.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint hover:bg-fill-soft hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </ToastClose>
        </Toast>
      )}
    </ToastRegion>
  )
}

export { Toaster, toast }
export { createToaster } from "@ui-sdk/react/toast"

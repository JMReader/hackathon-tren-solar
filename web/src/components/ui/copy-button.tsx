"use client"

import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState, type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

type CopyButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  value: string
  label?: string
  copiedLabel?: string
}

function CopyButton({ value, label = "Copiar", copiedLabel = "Copiado", variant = "outline", size = "sm", className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("tabular-nums", className)}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1800)
      }}
      {...props}
    >
      <span className="relative inline-grid size-4 place-items-center">
        <Copy
          aria-hidden
          className={cn(
            "col-start-1 row-start-1 transition-[opacity,scale,filter] duration-200 ease-out",
            copied && "scale-50 opacity-0 blur-[2px]",
          )}
        />
        <Check
          aria-hidden
          strokeWidth={2.5}
          className={cn(
            "col-start-1 row-start-1 text-[#2f7d4f] transition-[opacity,scale,filter] duration-200 ease-out",
            !copied && "scale-50 opacity-0 blur-[2px]",
          )}
        />
      </span>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  )
}

export { CopyButton }

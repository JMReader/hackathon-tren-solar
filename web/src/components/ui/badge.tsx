import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const variants = {
  default: "border-border-card bg-paper text-ink",
  accent: "border-accent/25 bg-accent-soft text-accent-deep",
  lime: "border-lime/50 bg-lime/15 text-accent-deep",
  neutral: "border-transparent bg-fill-soft text-ink-muted",
  danger: "border-danger/25 bg-danger/10 text-danger-hover",
} as const

type BadgeProps = ComponentProps<"span"> & {
  variant?: keyof typeof variants
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }

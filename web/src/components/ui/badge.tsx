import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const badgeStyles = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-paper text-ink shadow-raised",
        accent: "bg-accent-soft text-accent-deep",
        outline: "text-ink-muted ring-1 ring-hairline ring-inset",
        neutral: "bg-fill-soft text-ink-muted",
        danger: "bg-danger-soft text-danger-hover",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeStyles>) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />
}

function StatusDot({ className, ...props }: ComponentProps<"span">) {
  return <span aria-hidden className={cn("size-1.5 rounded-full bg-current", className)} {...props} />
}

export { Badge, StatusDot, badgeStyles }

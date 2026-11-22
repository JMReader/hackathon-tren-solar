import { Button as ButtonPrimitive } from "@ui-sdk/react/button"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const variants = {
  primary: "bg-accent text-inverse hover:bg-accent-hover",
  secondary: "bg-accent-soft text-accent-deep hover:bg-lime/40",
  outline: "bg-paper text-ink border border-border-card hover:bg-sunken",
  ghost: "text-ink hover:bg-fill-soft",
  danger: "bg-danger text-inverse hover:bg-danger-hover",
} as const

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-7 text-base",
} as const

type ButtonStyleOptions = {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

function buttonStyles({ variant = "primary", size = "md" }: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime data-disabled:pointer-events-none data-disabled:opacity-50 data-pending:pointer-events-none data-pending:opacity-60",
    variants[variant],
    sizes[size],
  )
}

type ButtonProps = ComponentProps<typeof ButtonPrimitive> & ButtonStyleOptions

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonStyles }

import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const cardStyles = cva("group/card flex flex-col rounded-[22px]", {
  variants: {
    variant: {
      default: "bg-paper text-ink shadow-raised",
      dark: "bg-slate text-on-dark shadow-[0_14px_34px_rgb(12_12_22/0.24)]",
      muted: "bg-sunken text-ink",
    },
  },
  defaultVariants: { variant: "default" },
})

function Card({ className, variant, ...props }: ComponentProps<"div"> & VariantProps<typeof cardStyles>) {
  return <div data-variant={variant ?? "default"} className={cn(cardStyles({ variant }), className)} {...props} />
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-6 pb-3", className)} {...props} />
}

function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "font-display text-lg leading-snug font-normal tracking-display text-ink group-data-[variant=dark]/card:text-inverse",
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-[13px] text-ink-muted group-data-[variant=dark]/card:text-on-dark-muted", className)} {...props} />
  )
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-6 pb-6 text-sm leading-relaxed", className)} {...props} />
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-auto flex items-center gap-2 px-6 pb-6", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardStyles }

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "w-fit text-xs font-semibold tracking-[0.08em] text-ink uppercase underline decoration-accent decoration-2 underline-offset-[6px]",
        className,
      )}
      {...props}
    />
  )
}

function Highlight({ className, ...props }: ComponentProps<"mark">) {
  return (
    <mark
      className={cn(
        "bg-transparent text-inherit underline decoration-accent decoration-[1.5px] underline-offset-[5px] [text-decoration-skip-ink:none]",
        className,
      )}
      {...props}
    />
  )
}

function Display({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "font-display text-5xl leading-[0.98] font-light tracking-[-0.045em] text-balance text-ink sm:text-6xl",
        className,
      )}
      {...props}
    />
  )
}

export { Eyebrow, Highlight, Display }

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function ShimmeringText({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-block animate-text-shimmer bg-[linear-gradient(100deg,var(--color-ink-muted)_35%,var(--color-ink)_50%,var(--color-ink-muted)_65%)] bg-size-[250%_100%] bg-clip-text text-transparent motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-ink-muted",
        className,
      )}
      {...props}
    />
  )
}

export { ShimmeringText }

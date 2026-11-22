import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-lg bg-sunken after:absolute after:inset-0 after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-white/55 after:to-transparent motion-reduce:after:hidden",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }

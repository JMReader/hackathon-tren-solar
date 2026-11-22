import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-[#eaebe5]", className)}
      {...props}
    />
  )
}

export { Skeleton }

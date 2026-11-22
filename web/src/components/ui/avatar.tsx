import {
  Avatar as AvatarPrimitive,
  AvatarFallback as AvatarFallbackPrimitive,
  AvatarImage as AvatarImagePrimitive,
} from "@ui-sdk/react/avatar"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive>) {
  return (
    <AvatarPrimitive
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-[13px] font-semibold text-ink select-none after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_0_0_1px_rgb(61_63_84/0.08)]",
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarImagePrimitive>) {
  return <AvatarImagePrimitive className={cn("size-full object-cover", className)} {...props} />
}

function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarFallbackPrimitive>) {
  return <AvatarFallbackPrimitive className={cn("flex size-full items-center justify-center", className)} {...props} />
}

function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w))
  const first = (w?: string) => (w ? [...new Intl.Segmenter().segment(w)][0]?.segment ?? "" : "")
  return (first(words[0]) + (words.length > 1 ? first(words.at(-1)) : "")).toUpperCase()
}

export { Avatar, AvatarImage, AvatarFallback, initials }

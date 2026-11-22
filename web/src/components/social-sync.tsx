"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { useSessionId, useSyncStyle } from "@/lib/api/hooks"

/** Al volver del OAuth con ?connected=<red>, dispara la importación de posts.
 *  X puede leer posts por API apenas conecta; LinkedIn se importa por URL. */
export function SocialSync() {
  const router = useRouter()
  const pathname = usePathname()
  const { mutate } = useSyncStyle(useSessionId().data)
  const handled = useRef(false)
  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(window.location.search)
    const connected = params.get("connected")
    if (connected === "linkedin" || connected === "x") {
      handled.current = true
      if (connected === "x") mutate({ platforms: ["x"] })
      params.delete("connected")
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [mutate, router, pathname])
  return null
}

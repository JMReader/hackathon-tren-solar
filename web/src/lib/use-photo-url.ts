"use client"

import { useQueries, useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { apiBlob } from "@/lib/api/client"
import { getPhotoPreview } from "@/lib/photo-preview"

/**
 * URL to show a private photo: the copy this browser kept when uploading it,
 * or the file from GET /media/{id} (owner session only) when logged in elsewhere.
 */
export function usePhotoUrl(photoId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["photo", photoId],
    enabled: Boolean(photoId),
    staleTime: Infinity,
    retry: false,
    queryFn: () => loadPhoto(photoId!),
  })
  const data = query.data
  useEffect(() => () => {
    if (data?.owned) URL.revokeObjectURL(data.url)
  }, [data])
  return data?.url ?? null
}

async function loadPhoto(photoId: string) {
  const local = getPhotoPreview(photoId)
  if (local) return { url: local, owned: false }
  const blob = await apiBlob(`/media/${photoId}`)
  return { url: URL.createObjectURL(blob), owned: true }
}

/** Several private photos at once (portfolio preview), as a photoId → URL map. */
export function usePhotoUrls(photoIds: (string | null | undefined)[]) {
  const ids = [...new Set(photoIds.filter((id): id is string => Boolean(id)))]
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["photo", id],
      staleTime: Infinity,
      retry: false,
      queryFn: () => loadPhoto(id),
    })),
  })
  const map = new Map<string, string>()
  ids.forEach((id, i) => {
    const url = results[i]?.data?.url
    if (url) map.set(id, url)
  })
  return map
}

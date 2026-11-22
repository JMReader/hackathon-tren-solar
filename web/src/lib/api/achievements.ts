"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"
import { toast } from "@/components/ui/toast"
import { achievementsIndex, type AchievementEntry } from "@/lib/achievements-index"
import { addCurrentPortfolioItem, fetchCurrentPortfolio } from "@/portfolio/portfolio-api"
import { ApiRequestError, apiFetch } from "./client"
import type { Achievement, ApiError, Draft, Fact, GenerateDraftsResponse, Platform } from "./types"

const achievementKey = (id: string) => ["achievement", id] as const
/** Same key the portfolio editor uses, so both read one list. */
const listKey = (sessionId: string | undefined) => ["achievements", sessionId] as const
const draftKey = (id: string) => ["draft", id] as const

export function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    const detail = (error.body as ApiError | null)?.error
    if (detail?.message) return detail.message
  }
  return fallback
}

export function apiErrorCode(error: unknown) {
  return error instanceof ApiRequestError ? (error.body as ApiError | null)?.error?.code : undefined
}

function onConflictOrError(queryClient: QueryClient, key: readonly unknown[], error: unknown) {
  if (error instanceof ApiRequestError && error.status === 409) {
    void queryClient.invalidateQueries({ queryKey: key })
    toast.error("Esto cambió desde otra pestaña", { description: "Recargamos la última versión. Volvé a aplicar tu cambio." })
    return
  }
  toast.error("No se pudo guardar", { description: apiErrorMessage(error, "Revisá tu conexión e intentá de nuevo.") })
}

const EMPTY: AchievementEntry[] = []
const cache = new Map<string, { raw: string; entries: AchievementEntry[] }>()

/** Achievements this browser created in the current session, newest first. */
export function useAchievementEntries(sessionId: string | undefined) {
  return useSyncExternalStore(
    achievementsIndex.subscribe,
    () => {
      if (!sessionId) return EMPTY
      const entries = achievementsIndex.list(sessionId)
      const raw = JSON.stringify(entries)
      const hit = cache.get(sessionId)
      if (hit?.raw === raw) return hit.entries
      cache.set(sessionId, { raw, entries })
      return entries
    },
    () => EMPTY,
  )
}

export function useAchievement(id: string | undefined, sessionId: string | undefined) {
  return useQuery({
    queryKey: achievementKey(id ?? ""),
    enabled: Boolean(id && sessionId),
    queryFn: () => apiFetch<Achievement>(`/achievements/${id}`),
  })
}

export function useAchievementList(sessionId: string | undefined) {
  return useQuery({
    queryKey: listKey(sessionId),
    enabled: Boolean(sessionId),
    queryFn: () => apiFetch<Achievement[]>("/achievements"),
  })
}

export function useStoredPortfolio(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-summary", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => fetchCurrentPortfolio().catch(() => null),
  })
}

/** The person chose to add this approved achievement to their portfolio. */
export function useAddToPortfolio(achievementId: string, sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => addCurrentPortfolioItem(achievementId),
    onSuccess: (portfolio) => {
      queryClient.setQueryData(["portfolio-summary", sessionId], portfolio)
      void queryClient.invalidateQueries({ queryKey: ["portfolio-draft"] })
    },
    onError: (error) => {
      const code = apiErrorCode(error)
      toast.error("No se pudo sumar al portfolio", {
        description:
          code === "portfolio_full"
            ? "Tu portfolio ya tiene 12 logros. Quitá uno para sumar otro."
            : code === "cv_required"
              ? "Primero subí tu CV."
              : apiErrorMessage(error, "Revisá tu conexión e intentá de nuevo."),
      })
    },
  })
}

export type CreateAchievementInput =
  | { kind: "audio"; audio: Blob; photo: File }
  | { kind: "text"; text: string; photo: File }

export function useCreateAchievement(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAchievementInput) => {
      const form = new FormData()
      form.append("input_type", input.kind)
      form.append("photo", input.photo, input.photo.name)
      if (input.kind === "audio") {
        const ext = input.audio.type.includes("mp4") ? "m4a" : input.audio.type.includes("ogg") ? "ogg" : "webm"
        form.append("audio", input.audio, `logro.${ext}`)
      } else form.append("text", input.text)
      return apiFetch<Achievement>("/achievements", { method: "POST", formData: form })
    },
    onSuccess: (achievement) => {
      queryClient.setQueryData(achievementKey(achievement.id), achievement)
      void queryClient.invalidateQueries({ queryKey: listKey(sessionId) })
      if (sessionId) achievementsIndex.add(sessionId, achievement.id)
    },
  })
}

export function useUpdateFacts(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: `achievement-${id}` },
    mutationFn: (facts: Fact[]) => {
      const current = queryClient.getQueryData<Achievement>(achievementKey(id))
      return apiFetch<Achievement>(`/achievements/${id}`, {
        method: "PATCH",
        json: { revision: current?.revision ?? 1, facts },
      })
    },
    onSuccess: (a) => {
      queryClient.setQueryData(achievementKey(id), a)
      void queryClient.invalidateQueries({ queryKey: ["achievements"] })
    },
    onError: (error) => onConflictOrError(queryClient, achievementKey(id), error),
  })
}

/** Approve the current revision and generate one draft per network (R3: drafts need approval). */
export function useApproveAndDraft(id: string, sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: `achievement-${id}` },
    mutationFn: async () => {
      const current = queryClient.getQueryData<Achievement>(achievementKey(id))
      const approved = await apiFetch<Achievement>(`/achievements/${id}/approve`, {
        method: "POST",
        json: { revision: current?.revision ?? 1 },
      })
      queryClient.setQueryData(achievementKey(id), approved)
      return apiFetch<GenerateDraftsResponse>(`/achievements/${id}/drafts`, {
        method: "POST",
        json: { achievement_revision: approved.revision, platforms: ["linkedin", "x"] },
      })
    },
    onSuccess: ({ drafts }) => {
      const ids: Partial<Record<Platform, string>> = {}
      for (const d of drafts) {
        queryClient.setQueryData(draftKey(d.id), d)
        ids[d.platform] = d.id
      }
      if (sessionId) achievementsIndex.setDrafts(sessionId, id, ids)
      void queryClient.invalidateQueries({ queryKey: listKey(sessionId) })
    },
    onError: (error) => {
      if (error instanceof ApiRequestError && error.status === 502) {
        toast.error("No pudimos escribir los posts", { description: "El generador no respondió. Probá de nuevo en un momento." })
        return
      }
      onConflictOrError(queryClient, achievementKey(id), error)
    },
  })
}

export function useDraft(id: string | undefined, sessionId: string | undefined) {
  return useQuery({
    queryKey: draftKey(id ?? ""),
    enabled: Boolean(id && sessionId),
    queryFn: () => apiFetch<Draft>(`/drafts/${id}`),
  })
}

export function useUpdateDraft(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: `draft-${id}` },
    mutationFn: (body: string) => {
      const current = queryClient.getQueryData<Draft>(draftKey(id))
      return apiFetch<Draft>(`/drafts/${id}`, { method: "PATCH", json: { revision: current?.revision ?? 1, body } })
    },
    onSuccess: (d) => queryClient.setQueryData(draftKey(id), d),
    onError: (error) => onConflictOrError(queryClient, draftKey(id), error),
  })
}

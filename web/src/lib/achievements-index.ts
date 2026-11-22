// The API has no "list my achievements" endpoint, so the browser keeps the ids it created
// (per session, like the session id itself) plus the drafts and questions it already handled.
import type { Platform } from "./api/types"

export interface AchievementEntry {
  id: string
  createdAt: string
  drafts?: Partial<Record<Platform, string>>
  dismissedQuestions?: string[]
}

const key = (sessionId: string) => `tren-solar.achievements.${sessionId}`
const listeners = new Set<() => void>()

function read(sessionId: string): AchievementEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem(key(sessionId)) ?? "[]") as AchievementEntry[]
  } catch {
    return []
  }
}

function write(sessionId: string, entries: AchievementEntry[]) {
  window.localStorage.setItem(key(sessionId), JSON.stringify(entries))
  listeners.forEach((l) => l())
}

function update(sessionId: string, id: string, patch: (e: AchievementEntry) => AchievementEntry) {
  const entries = read(sessionId)
  const index = entries.findIndex((e) => e.id === id)
  const base = index >= 0 ? entries[index] : { id, createdAt: new Date().toISOString() }
  const next = patch(base)
  if (index >= 0) entries[index] = next
  else entries.unshift(next)
  write(sessionId, entries)
}

export const achievementsIndex = {
  list: read,
  get: (sessionId: string, id: string) => read(sessionId).find((e) => e.id === id),
  add: (sessionId: string, id: string) => update(sessionId, id, (e) => e),
  setDrafts: (sessionId: string, id: string, drafts: Partial<Record<Platform, string>>) =>
    update(sessionId, id, (e) => ({ ...e, drafts })),
  dismissQuestion: (sessionId: string, id: string, questionId: string) =>
    update(sessionId, id, (e) => ({
      ...e,
      dismissedQuestions: [...new Set([...(e.dismissedQuestions ?? []), questionId])],
    })),
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    window.addEventListener("storage", listener)
    return () => {
      listeners.delete(listener)
      window.removeEventListener("storage", listener)
    }
  },
}

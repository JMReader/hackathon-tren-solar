const PORTFOLIO_ID_KEY = "tren-solar.portfolio-id"

export function getStoredPortfolioId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(PORTFOLIO_ID_KEY)
}

export function setStoredPortfolioId(id: string) {
  window.localStorage.setItem(PORTFOLIO_ID_KEY, id)
}

export function clearStoredPortfolioId() {
  window.localStorage.removeItem(PORTFOLIO_ID_KEY)
}

const DECLINED_KEY = "tren-solar.portfolio-declined"

/** Achievements the person chose not to add to the portfolio, so we don't ask again. */
export function getDeclinedAchievements(): string[] {
  if (typeof window === "undefined") return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(DECLINED_KEY) ?? "[]")
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

export function setAchievementDeclined(id: string, declined: boolean) {
  const rest = getDeclinedAchievements().filter((other) => other !== id)
  window.localStorage.setItem(DECLINED_KEY, JSON.stringify(declined ? [...rest, id] : rest))
}

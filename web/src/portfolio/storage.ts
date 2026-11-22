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
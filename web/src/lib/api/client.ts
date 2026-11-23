const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"
const SESSION_KEY = "tren-solar.session-id"

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API request failed with status ${status}`)
    this.name = "ApiRequestError"
  }
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(SESSION_KEY)
}

export function setSessionId(id: string) {
  window.localStorage.setItem(SESSION_KEY, id)
}

const ACCOUNT_KEY = "tren-solar.account-name"

/** Name of the demo account used to log in, if any (anonymous sessions have none). */
export function getAccountName(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACCOUNT_KEY)
}

export function setAccountName(name: string) {
  window.localStorage.setItem(ACCOUNT_KEY, name)
}

/** Forget everything this browser keeps for the session (ids, previews, portfolio). */
export function signOut() {
  for (const key of Object.keys(window.localStorage))
    if (key.startsWith("tren-solar.")) window.localStorage.removeItem(key)
  for (const key of Object.keys(window.sessionStorage))
    if (key.startsWith("tren-solar.")) window.sessionStorage.removeItem(key)
}

export function clearSessionId() {
  window.localStorage.removeItem(SESSION_KEY)
}

/** Raw file from the API (e.g. a private photo), with the session header. */
export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers()
  const sessionId = getSessionId()
  if (sessionId) headers.set("X-Session-Id", sessionId)
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) throw new ApiRequestError(res.status, null)
  return res.blob()
}

type ApiInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | null
  json?: unknown
  formData?: FormData
}

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, formData, headers, body: initBody, ...rest } = init
  const merged = new Headers(headers)
  const sessionId = getSessionId()
  if (sessionId) merged.set("X-Session-Id", sessionId)

  let body = initBody
  if (json !== undefined) {
    merged.set("Content-Type", "application/json")
    body = JSON.stringify(json)
  } else if (formData) {
    body = formData
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: merged, body })
  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null)
    throw new ApiRequestError(res.status, payload)
  }
  if (res.status === 204 || res.status === 202) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

/** Demo pitch only — not for production. Lives server-side only. */

export type DemoAccount = {
  email: string
  password: string
  display_name: string
}

const DEFAULT_PASSWORD = "Demo1234"

function loadAccounts(): DemoAccount[] {
  const raw = process.env.DEMO_ACCOUNTS
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoAccount[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      /* fall through to built-ins */
    }
  }
  return [
    { email: "juanmcoro2003@gmail.com", password: DEFAULT_PASSWORD, display_name: "Juan" },
    { email: "mauromamani.b@gmail.com", password: DEFAULT_PASSWORD, display_name: "Mauro" },
    { email: "maykox34f@gmail.com", password: DEFAULT_PASSWORD, display_name: "Mayko" },
    { email: "riosmaurii@gmail.com", password: DEFAULT_PASSWORD, display_name: "Mauri" },
  ]
}

const ACCOUNTS = loadAccounts()

export function matchDemoAccount(email: string, password: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase()
  const hit = ACCOUNTS.find((a) => a.email.toLowerCase() === normalized)
  if (!hit || hit.password !== password) return null
  return hit
}
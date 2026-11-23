"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ApiRequestError, apiFetch, setAccountName, setSessionId } from "@/lib/api/client"

const INVALID_MSG = "Correo o contraseña incorrectos"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await apiFetch<{ session_id: string; display_name: string }>("/auth/login", {
        method: "POST",
        json: { email, password },
      })
      setSessionId(result.session_id)
      setAccountName(result.display_name)
      router.push("/app")
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setError(INVALID_MSG)
      } else {
        setError("No pudimos iniciar sesión. Probá de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-display">Ingresar</CardTitle>
        <CardDescription>Entrá con tu cuenta del equipo para seguir en tu espacio.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          <Field invalid={Boolean(error)}>
            <FieldLabel htmlFor="login-email">Correo</FieldLabel>
            <FieldControl
              render={
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  required
                  disabled={loading}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                />
              }
            />
          </Field>
          <Field invalid={Boolean(error)}>
            <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
            <FieldControl
              render={
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  required
                  disabled={loading}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                />
              }
            />
            {error ? (
              <FieldError role="alert">{error}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
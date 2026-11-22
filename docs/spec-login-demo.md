---
date: 2026-11-22
author: equipo
status: spec para demo de pitch
---

# Spec — Login mínimo para la demo (pitch)

## 1. Contexto

Para presentar el producto necesitamos que cada integrante del equipo entre con su propia cuenta y aterrice en su espacio (`/app`). Hoy no existe autenticación: la sesión es anónima (`POST /api/v1/session` + `X-Session-Id`).

Esta spec define un login chico y honesto, pensado sólo para la demo. No es auth de producción.

## 2. Objetivo

Pantalla `/login` que autentica cuatro cuentas fijas (una por integrante) con correo + contraseña, crea la sesión de la app y redirige a `/app`. Si las credenciales no coinciden, muestra un error claro sin revelar cuál campo falló.

## 3. Cuentas de la demo

| Cuenta (mail) | Contraseña | Nombre visible |
|---|---|---|
| `juanmcoro2003@gmail.com` | `Demo1234` | Juan |
| `mauromamani.b@gmail.com` | `Demo1234` | Mauro |
| `maykox34f@gmail.com` | `Demo1234` | Mayko |
| `riosmaurii@gmail.com` | `Demo1234` | Mauri |

Las credenciales viven sólo en el servidor (route handler o env); nunca en el bundle del cliente ni en `localStorage`. La contraseña no se persiste en el cliente.

## 4. Flujo

1. Usuario abre `/login` (link "Ingresar" en la navegación de la landing, junto a "Empresas").
2. Completa correo y contraseña → `POST /api/v1/auth/login` con `{ email, password }`.
3. Si coincide una cuenta: el handler crea una sesión real (`POST /api/v1/session` del mock local o del backend vía proxy, según el entorno), asocia el `display_name` de la cuenta al perfil de esa sesión (`POST /api/v1/session/profile` cuando el endpoint lo permita) y responde `{ session_id, display_name }`.
4. El front guarda `session_id` con `setSessionId` (ya existe en `src/lib/api/client.ts`, lo adjunta como `X-Session-Id`) y navega a `/app`.
5. Si no coincide: `401` y `FieldError` "Correo o contraseña incorrectos". Mismo mensaje para mail inexistente y contraseña errada.
6. Mientras el request viaja, el botón queda `disabled` con estado de carga.

## 5. UI (kit del repo)

Usar sólo componentes de `src/components/ui/` y el lenguaje visual AudioPen documentado en `web/AGENTS.md`:

- Estructura: `Card` centrada en pantalla sobre `bg-cream`, título con `font-display` (Fraunces), texto auxiliar `text-ink-muted`.
- Campos: `Field` + `FieldLabel` + `FieldControl` con `Input` (`type="email"`, `type="password"`, `autoComplete` correcto) y `FieldError` para el error.
- Acción: `Button` primario full-width "Ingresar".
- Sin estilos inline ni colores fuera de los tokens (`--color-*` en `globals.css`). Revisar `/ui` como referencia de estados.
- Accesible: labels reales, error anunciado (`role="alert"` o el mecanismo de `FieldError`), foco visible con `focus-ring`, Enter envía el formulario (usar `<form>`).

## 6. Backend

- `POST /api/v1/auth/login` como route handler en `web/src/app/api/v1/auth/login/route.ts`.
- Cuentas en constante del servidor (o env `DEMO_ACCOUNTS` como JSON) — aceptable para la demo; comentar que no va a producción así.
- Responder `401 { error: { code: "invalid_credentials" } }` ante fallo; `200 { session_id, display_name }` ante éxito.
- No loguear la contraseña. No devolver el listado de cuentas.
- `POST /api/v1/auth/logout` opcional: limpia la sesión (el front borra `session_id` con `clearSessionId`).

## 7. Criterios de aceptación

- [ ] `/login` renderiza con componentes del kit y pasa `tsc` + `eslint`.
- [ ] Cada una de las 4 cuentas entra y cae en `/app` con su nombre visible en el perfil.
- [ ] Credencial inválida muestra el error sin revelar el campo ni la lista de cuentas.
- [ ] La sesión creada funciona contra los endpoints existentes (`X-Session-Id`).
- [ ] Sin credenciales en el bundle (verificable: `grep` del build no muestra los mails ni la contraseña).
- [ ] Enlace "Ingresar" visible desde la landing.

## 8. Fuera de alcance

Registro, recuperación de contraseña, hashing/JWT/OAuth real, rate limiting, roles. Para producción se decide auth en otra spec.

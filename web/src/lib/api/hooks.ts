"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "@/components/ui/toast"
import {
  ApiRequestError,
  apiFetch,
  clearSessionId,
  getSessionId,
  setSessionId,
} from "./client"
import type {
  ApiError,
  AuthorProfile,
  MediaAsset,
  Platform,
  SessionCreated,
  SocialConnectionStatus,
  StartSocialConnectionResponse,
  SyncStyleRequest,
} from "./types"

function profileKey(sessionId: string | undefined) {
  return ["profile", sessionId] as const
}

// Profile writes share one queue so each request reads the revision left by the previous one.
function profileScope(sessionId: string | undefined) {
  return { id: `profile-${sessionId}` }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    const detail = (error.body as ApiError | null)?.error
    if (detail?.message) return detail.message
  }
  return fallback
}

function handleMutationError(
  queryClient: QueryClient,
  sessionId: string | undefined,
  error: unknown,
) {
  if (error instanceof ApiRequestError && error.status === 409) {
    void queryClient.invalidateQueries({ queryKey: profileKey(sessionId) })
    toast.error("Tu perfil cambió desde otra parte", {
      description: "Recargamos los datos. Volvé a intentarlo.",
    })
    return
  }
  toast.error("No se pudo guardar", {
    description: errorMessage(error, "Revisá tu conexión e intentá de nuevo."),
  })
}

export function useSessionId() {
  return useQuery({
    queryKey: ["session"],
    staleTime: Infinity,
    queryFn: async () => {
      const stored = getSessionId()
      if (stored) {
        try {
          await apiFetch<AuthorProfile>("/session/profile")
          return stored
        } catch (error) {
          if (!(error instanceof ApiRequestError && error.status === 401))
            throw error
          clearSessionId()
        }
      }
      const created = await apiFetch<SessionCreated>("/session", {
        method: "POST",
      })
      setSessionId(created.session_id)
      return created.session_id
    },
  })
}

export function useProfile(sessionId: string | undefined) {
  return useQuery({
    queryKey: profileKey(sessionId),
    enabled: Boolean(sessionId),
    queryFn: () => apiFetch<AuthorProfile>("/session/profile"),
  })
}

export function useSocialConnection(
  platform: Platform,
  sessionId: string | undefined,
) {
  return useQuery({
    queryKey: ["connection", platform, sessionId],
    enabled: Boolean(sessionId),
    queryFn: () =>
      apiFetch<SocialConnectionStatus>(`/social/${platform}/connection`),
  })
}

export function useUpdateProfile(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: profileScope(sessionId),
    mutationFn: (patch: {
      profession?: string | null
      writing_sample?: string | null
    }) => {
      const profile = queryClient.getQueryData<AuthorProfile>(
        profileKey(sessionId),
      )
      return apiFetch<AuthorProfile>("/session/profile", {
        method: "PATCH",
        json: { revision: profile?.revision ?? 1, ...patch },
      })
    },
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKey(sessionId), profile),
    onError: (error) => handleMutationError(queryClient, sessionId, error),
  })
}

export function useUploadPhoto(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: profileScope(sessionId),
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const media = await apiFetch<MediaAsset>("/media", {
        method: "POST",
        formData,
      })
      const profile = queryClient.getQueryData<AuthorProfile>(
        profileKey(sessionId),
      )
      return apiFetch<AuthorProfile>("/session/profile/photo", {
        method: "PUT",
        json: { revision: profile?.revision ?? 1, photo_id: media.photo_id },
      })
    },
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKey(sessionId), profile),
    onError: (error) => handleMutationError(queryClient, sessionId, error),
  })
}

export function useUploadCv(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: profileScope(sessionId),
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return apiFetch<AuthorProfile>("/session/cv", {
        method: "POST",
        formData,
      })
    },
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKey(sessionId), profile),
    onError: (error) => handleMutationError(queryClient, sessionId, error),
  })
}

export function useConnectSocial(
  platform: Platform,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (returnTo: string) =>
      apiFetch<StartSocialConnectionResponse>(
        `/social/${platform}/connection`,
        { method: "POST", json: { return_to: returnTo } },
      ),
    onSuccess: (response) => {
      window.location.assign(response.authorization_url)
    },
    onError: (error) => {
      void queryClient.invalidateQueries({
        queryKey: ["connection", platform, sessionId],
      })
      // 503 leaves the card in access_unavailable, which explains it inline.
      if (error instanceof ApiRequestError && error.status === 503) return
      toast.error("No se pudo iniciar la conexión", {
        description: errorMessage(error, "Intentá de nuevo en un rato."),
      })
    },
  })
}

export function useSyncStyle(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: profileScope(sessionId),
    mutationFn: async (request: SyncStyleRequest = {}) => {
      try {
        const profile = await apiFetch<AuthorProfile>(
          "/session/profile/sync-style",
          { method: "POST", json: request },
        )
        return { profile, partial: false }
      } catch (error) {
        const body = error instanceof ApiRequestError ? error.body : null
        if (
          error instanceof ApiRequestError &&
          error.status === 503 &&
          body &&
          typeof body === "object" &&
          "style_sync" in body
        )
          return { profile: body as AuthorProfile, partial: true }
        throw error
      }
    },
    onSuccess: ({ profile }) => {
      queryClient.setQueryData(profileKey(sessionId), profile)
      const imported =
        profile.style_sync.linkedin.posts_imported +
        profile.style_sync.x.posts_imported
      if (imported > 0)
        toast.success("Aprendimos tu estilo", {
          description: `Importamos ${imported} post${imported === 1 ? "" : "s"} de tus redes.`,
        })
      else
        toast.error("No pudimos leer posts de tus redes", {
          description: "Podés dejar una muestra de escritura abajo.",
        })
    },
    onError: (error) =>
      toast.error("No se pudo sincronizar tu estilo", {
        description: errorMessage(error, "Intentá de nuevo en un rato."),
      }),
  })
}

export function useCompleteOnboarding(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: profileScope(sessionId),
    mutationFn: () => {
      const profile = queryClient.getQueryData<AuthorProfile>(
        profileKey(sessionId),
      )
      return apiFetch<AuthorProfile>("/session/profile/complete", {
        method: "POST",
        json: { revision: profile?.revision ?? 1 },
      })
    },
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKey(sessionId), profile),
    onError: (error) => {
      if (error instanceof ApiRequestError && error.status === 400) {
        toast.error("Todavía falta algo", {
          description: errorMessage(error, "Revisá los campos obligatorios."),
        })
        return
      }
      handleMutationError(queryClient, sessionId, error)
    },
  })
}

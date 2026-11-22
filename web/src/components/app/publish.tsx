"use client"

import { Check, ChevronLeft, Download, ExternalLink, LayoutTemplate, Mic, Pencil, Send, UserRound } from "lucide-react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  apiErrorCode,
  apiErrorMessage,
  useAchievement,
  useAchievementEntries,
  useApproveAndDraft,
  useAssistedShare,
  useDraft,
  useDraftPublications,
  usePublishDraft,
  useUpdateDraft,
} from "@/lib/api/achievements"
import { useConnectSocial, useSocialConnection } from "@/lib/api/hooks"
import type { AuthorProfile, Draft, Platform } from "@/lib/api/types"
import { getPhotoPreview } from "@/lib/photo-preview"
import { useIsClient } from "@/lib/use-is-client"
import { cn } from "@/lib/utils"
import { PageSkeleton, useAppSession } from "./common"
import { AppPage, CreateSteps, PageTitle } from "./shell"

const NETWORK: Record<Platform, { name: string; mark: string; tone: string; handle: (p?: AuthorProfile) => string }> = {
  linkedin: { name: "LinkedIn", mark: "in", tone: "bg-[#0a66c2]", handle: (p) => p?.profession ?? "Tu profesión" },
  x: { name: "X", mark: "X", tone: "bg-[#111]", handle: () => "@tu_usuario" },
}

function PublishPanel({ draft, editing }: { draft: Draft; editing: boolean }) {
  const { sessionId } = useAppSession()
  const pathname = usePathname()
  const connection = useSocialConnection(draft.platform, sessionId)
  const connect = useConnectSocial(draft.platform, sessionId)
  const publications = useDraftPublications(draft.id, sessionId)
  const publish = usePublishDraft(draft)
  const net = NETWORK[draft.platform]
  const state = connection.data?.status ?? "disconnected"
  const latest = publications.data?.[0]
  const succeeded = publications.data?.find((p) => p.status === "succeeded")
  const assisted = useAssistedShare(draft.id, sessionId, !succeeded)
  const inFlight = publish.isPending || latest?.status === "publishing"

  const onPublish = () =>
    publish.mutate(undefined, {
      onError: (error) => {
        const code = apiErrorCode(error)
        if (code === "ALREADY_PUBLISHED") return void publications.refetch()
        if (code === "CONNECTION_REQUIRED" || code === "ACCESS_UNAVAILABLE") {
          void connection.refetch()
          toast.error(`Conectá tu cuenta de ${net.name}`, {
            description: apiErrorMessage(error, "Así el post sale con tu usuario."),
          })
          return
        }
        toast.error(`No se pudo publicar en ${net.name}`, {
          description: apiErrorMessage(error, "Revisá tu conexión e intentá de nuevo."),
        })
      },
    })

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-fill-soft p-4">
      {succeeded ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">
            <Check aria-hidden /> Publicado
          </Badge>
          {succeeded.external_url ? (
            <a
              href={succeeded.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline"
            >
              Ver en {net.name} <ExternalLink aria-hidden className="size-3.5" />
            </a>
          ) : (
            <span className="text-[13px] text-ink-muted">Quedó en tu {net.name}.</span>
          )}
        </div>
      ) : state === "connected" ? (
        <>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {connection.data?.account_handle ? `Conectado como ${connection.data.account_handle}. ` : ""}
            {draft.photo_id && !connection.data?.can_publish_image
              ? `${net.name} puede rechazar la foto desde acá; si pasa, abrí el post asistido abajo.`
              : "Sale con el texto y la foto tal como están arriba."}
          </p>
          <div>
            <Button size="sm" disabled={editing || inFlight} onClick={onPublish}>
              <Send aria-hidden /> {inFlight ? "Publicando…" : `Publicar en ${net.name}`}
            </Button>
          </div>
        </>
      ) : state === "access_unavailable" ? (
        <p className="text-[13px] leading-relaxed text-ink-muted">
          {connection.data?.reason ?? `${net.name} no permite publicar desde la app.`} Usá el texto listo abajo.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="dark" size="sm" disabled={connect.isPending} onClick={() => connect.mutate(pathname)}>
            {connect.isPending ? "Abriendo…" : `Conectar ${net.name}`}
          </Button>
          <p className="text-xs text-ink-muted">Así el post sale con tu cuenta, sin copiar nada.</p>
        </div>
      )}
      {!succeeded && latest?.status === "failed" && (
        <p role="alert" className="text-xs leading-relaxed text-danger">
          {latest.error?.message ?? "La última publicación falló. Podés reintentar."}
        </p>
      )}
      {!succeeded && latest?.status === "unknown" && (
        <p role="alert" className="text-xs leading-relaxed text-ink-muted">
          No confirmamos si el último intento llegó a {net.name}. Verificá tu perfil antes de reintentar.
        </p>
      )}
      {assisted.data && !succeeded && (
        <a
          href={assisted.data.composer_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-start text-xs font-medium text-ink-muted hover:text-ink hover:underline"
        >
          Abrir {net.name} con el texto listo <ExternalLink aria-hidden className="size-3" />
        </a>
      )}
    </div>
  )
}

function DraftCard({
  draft,
  profile,
  photo,
  avatar,
  className,
}: {
  draft: Draft
  profile?: AuthorProfile
  photo: string | null
  avatar: string | null
  className?: string
}) {
  const update = useUpdateDraft(draft.id)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft.body)
  const net = NETWORK[draft.platform]
  const length = editing ? text.length : draft.char_count
  const over = length - draft.max_chars

  return (
    <Card className={cn("gap-4 p-5", className)}>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white", net.tone)}>{net.mark}</span>
        <span className="text-sm font-medium text-ink">{net.name}</span>
        <Badge variant="neutral" className="ml-auto">
          {draft.platform === "x" ? "Hasta 280" : "Post largo"}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-ink-muted">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            <UserRound aria-hidden className="size-5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">Vos</span>
          <span className="block truncate text-xs text-ink-muted">{net.handle(profile)}</span>
        </span>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            aria-label={`Editar post de ${net.name}`}
            value={text}
            rows={draft.platform === "x" ? 6 : 10}
            autoFocus
            aria-invalid={over > 0}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-ink-muted">Se guarda solo en {net.name}.</span>
            <span className={cn("tabular-nums", over > 0 ? "font-medium text-accent-strong" : "text-ink-muted")}>
              {length} / {draft.max_chars}
              {over > 0 && ` · sobran ${over}`}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setText(draft.body)
                setEditing(false)
              }}
            >
              Deshacer
            </Button>
            <Button
              variant="dark"
              size="sm"
              disabled={over > 0 || text.trim().length === 0 || update.isPending}
              onClick={() =>
                update.mutateAsync(text).then(
                  () => setEditing(false),
                  () => undefined,
                )
              }
            >
              {update.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink">{draft.body}</p>
      )}

      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- local preview
        <img src={photo} alt="Foto del proyecto" className="max-h-64 w-full rounded-2xl object-cover" />
      )}

      <PublishPanel draft={draft} editing={editing} />

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-divider pt-4">
        <span className="text-xs text-ink-muted tabular-nums">
          {draft.char_count} / {draft.max_chars}
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Editar
            </Button>
          )}
          {photo && (
            <a href={photo} download={`foto-${draft.platform}.jpg`} className={buttonStyles({ variant: "outline", size: "sm" })}>
              <Download aria-hidden /> Foto
            </a>
          )}
          <CopyButton
            value={draft.body}
            variant="dark"
            label="Copiar texto"
            copiedLabel="Copiado"
            disabled={editing}
            aria-label={`Copiar texto para ${net.name}`}
          />
        </span>
      </div>
    </Card>
  )
}

function Drafts({ ids, profile, photo }: { ids: Partial<Record<Platform, string>>; profile?: AuthorProfile; photo: string | null }) {
  const { sessionId } = useAppSession()
  const isClient = useIsClient()
  const linkedin = useDraft(ids.linkedin, sessionId)
  const x = useDraft(ids.x, sessionId)
  const [active, setActive] = useState<Platform>("linkedin")
  const avatar = isClient ? getPhotoPreview(profile?.photo_id) : null
  const drafts = [linkedin, x]

  return (
    <div className="mt-6 flex flex-col gap-4 lg:mt-8">
      <SegmentedControl
        value={active}
        onValueChange={(v) => setActive((v as Platform) ?? "linkedin")}
        aria-label="Red"
        className="self-stretch lg:hidden [&>*]:flex-1"
      >
        <SegmentedControlItem value="linkedin">LinkedIn</SegmentedControlItem>
        <SegmentedControlItem value="x">X</SegmentedControlItem>
      </SegmentedControl>
      <div className="grid gap-5 lg:grid-cols-2">
        {drafts.map((q, i) => {
          const platform: Platform = i === 0 ? "linkedin" : "x"
          const hidden = active !== platform && "max-lg:hidden"
          if (q.isPending) return <Skeleton key={platform} className={cn("h-96 rounded-[22px]", hidden)} />
          if (!q.data)
            return (
              <Card key={platform} variant="muted" className={cn("p-5 text-[13px] text-ink-muted", hidden)}>
                No pudimos cargar el post de {NETWORK[platform].name}.
              </Card>
            )
          return <DraftCard key={q.data.id} draft={q.data} profile={profile} photo={photo} avatar={avatar} className={hidden || undefined} />
        })}
      </div>
    </div>
  )
}

export function PublishAchievement() {
  const { id } = useParams<{ id: string }>()
  const { sessionId, profile, isLoading } = useAppSession()
  const isClient = useIsClient()
  const achievement = useAchievement(id, sessionId)
  const entry = useAchievementEntries(sessionId).find((e) => e.id === id)
  const generate = useApproveAndDraft(id, sessionId)
  const photo = isClient ? getPhotoPreview(achievement.data?.photo_id) : null

  return (
    <AppPage>
      <CreateSteps current={3} />
      <PageTitle title="Tus posts, listos" lead="Editá lo que quieras y publicalos con tu cuenta, o copiá el texto y pegalo en cada red con la foto." />

      {isLoading || achievement.isPending ? (
        <div className="mt-8">
          <PageSkeleton />
        </div>
      ) : !achievement.data ? (
        <Card variant="muted" className="mt-8 items-start gap-3 p-5">
          <p className="text-sm text-ink">No encontramos este logro.</p>
          <Link href="/app/crear" className={buttonStyles({ variant: "dark", size: "sm" })}>
            Contar un logro
          </Link>
        </Card>
      ) : entry?.drafts ? (
        <Drafts ids={entry.drafts} profile={profile} photo={photo} />
      ) : achievement.data.status !== "approved" ? (
        <Card variant="muted" className="mt-8 items-start gap-3 p-5">
          <p className="text-sm text-ink">Primero revisá y aprobá los hechos.</p>
          <Link href={`/app/crear/${id}/revisar`} className={buttonStyles({ variant: "dark", size: "sm" })}>
            Revisar logro
          </Link>
        </Card>
      ) : (
        <Card variant="muted" className="mt-8 items-start gap-3 p-5">
          <p className="text-sm text-ink">Este logro está aprobado pero todavía no tiene posts en este navegador.</p>
          <Button variant="dark" size="sm" disabled={generate.isPending} onClick={() => void generate.mutateAsync().catch(() => null)}>
            {generate.isPending ? "Armando…" : "Armar posts"}
          </Button>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-hairline pt-5 pb-2 lg:mt-auto lg:py-6">
        <Link href={`/app/crear/${id}/revisar`} className={buttonStyles({ variant: "ghost" })}>
          <ChevronLeft aria-hidden /> Volver a revisar
        </Link>
        <span className="ml-auto hidden text-xs text-ink-muted xl:inline">Editar un post no cambia el otro.</span>
        {achievement.data?.status === "approved" && (
          <Link href="/app/portfolio" className={buttonStyles({ variant: "ghost" })}>
            <LayoutTemplate aria-hidden /> Ver en mi portfolio
          </Link>
        )}
        <Link href="/app/crear" className={buttonStyles({ variant: "outline" })}>
          <Mic aria-hidden /> Contar otro logro
        </Link>
      </div>
    </AppPage>
  )
}

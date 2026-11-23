"use client"

import { ArrowRight, Check, ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonStyles } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { achievementsIndex } from "@/lib/achievements-index"
import { useAchievement, useAchievementEntries, useApproveAndDraft, useDeleteAchievement, useDraftIds, useUpdateFacts } from "@/lib/api/achievements"
import type { Achievement, Fact, OpenQuestion } from "@/lib/api/types"
import { usePhotoUrl } from "@/lib/use-photo-url"
import { cn } from "@/lib/utils"
import { CATEGORY_LABEL, PageSkeleton, StatusBadge, useAppSession } from "./common"
import { AppPage, CreateSteps, PageTitle } from "./shell"

function FactRow({
  fact,
  busy,
  onSave,
  onDelete,
}: {
  fact: Fact
  busy: boolean
  onSave: (text: string) => Promise<unknown>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fact.text)
  const tooShort = draft.trim().length < 3

  return (
    <li className={cn("flex gap-3 px-5 py-4", editing && "bg-accent-soft/40")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {fact.category && <Badge variant="neutral">{CATEGORY_LABEL[fact.category]}</Badge>}
          {fact.source === "user" && <Badge variant="outline">Agregado por vos</Badge>}
        </div>
        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea aria-label="Editar hecho" value={draft} rows={3} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(fact.text)
                  setEditing(false)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="dark"
                size="sm"
                disabled={tooShort || busy}
                onClick={() =>
                  onSave(draft.trim()).then(
                    () => setEditing(false),
                    () => undefined,
                  )
                }
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{fact.text}</p>
        )}
        {fact.source_quote ? (
          <p className="mt-2 inline-flex gap-1.5 rounded-xl bg-cream px-3 py-2 text-xs leading-relaxed text-ink-muted">
            <span aria-hidden className="font-display text-[15px] leading-none text-accent-strong">
              “
            </span>
            <span>
              <span className="sr-only">Lo dijiste así: </span>
              {fact.source_quote}
            </span>
          </p>
        ) : (
          fact.source === "user" && <p className="mt-2 text-xs text-ink-muted">Sin cita del audio: lo agregaste o lo editaste vos.</p>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 items-start gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Editar hecho" onClick={() => setEditing(true)} disabled={busy}>
            <Pencil aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Borrar hecho" onClick={onDelete} disabled={busy}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      )}
    </li>
  )
}

function QuestionCard({
  question,
  busy,
  onAnswer,
  onSkip,
}: {
  question: OpenQuestion
  busy: boolean
  onAnswer: (answer: string) => Promise<unknown>
  onSkip: () => void
}) {
  const [answer, setAnswer] = useState("")
  return (
    <Card className="gap-3 bg-accent-soft p-5 shadow-none">
      <p className="text-[11px] font-semibold tracking-wide text-accent-deep uppercase">Nos falta un dato</p>
      <p className="text-sm leading-relaxed text-ink-strong">{question.question}</p>
      <Textarea
        aria-label="Tu respuesta"
        value={answer}
        rows={2}
        placeholder="Respondé y lo sumamos como dato tuyo"
        onChange={(e) => setAnswer(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip} disabled={busy}>
          Saltear
        </Button>
        <Button variant="dark" size="sm" disabled={answer.trim().length < 3 || busy} onClick={() => onAnswer(answer.trim())}>
          Sumar
        </Button>
      </div>
    </Card>
  )
}

function ReviewBody({ achievement, sessionId }: { achievement: Achievement; sessionId: string }) {
  const router = useRouter()
  const update = useUpdateFacts(achievement.id)
  const approve = useApproveAndDraft(achievement.id, sessionId)
  const [adding, setAdding] = useState(false)
  const [newFact, setNewFact] = useState("")
  const entry = useAchievementEntries(sessionId).find((e) => e.id === achievement.id)
  const dismissed = new Set(entry?.dismissedQuestions ?? [])
  const questions = achievement.open_questions.filter((q) => !dismissed.has(q.id))
  const photo = usePhotoUrl(achievement.photo_id)
  const drafts = useDraftIds(achievement.id, sessionId)
  const remove = useDeleteAchievement(achievement.id, sessionId)
  const busy = update.isPending || approve.isPending

  const nextId = () => `fact_user_${Date.now().toString(36)}`
  const save = (facts: Fact[]) => update.mutateAsync(facts)

  return (
    <>
      <div className="mt-7 grid flex-1 gap-8 lg:mt-10 lg:grid-cols-[1fr_340px] lg:gap-12">
        <section aria-labelledby="hechos" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 id="hechos" className="text-[15px] font-medium text-ink">
              Lo que hiciste
            </h2>
            <Badge variant="neutral" className="tabular-nums">
              {achievement.facts.length} hecho{achievement.facts.length === 1 ? "" : "s"}
            </Badge>
            <span className="ml-auto">
              <StatusBadge status={achievement.status} />
            </span>
          </div>

          {achievement.facts.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-divider">
                {achievement.facts.map((fact) => (
                  <FactRow
                    key={`${fact.id}-${achievement.revision}`}
                    fact={fact}
                    busy={busy}
                    onSave={(text) => save(achievement.facts.map((f) => (f.id === fact.id ? { ...f, text } : f)))}
                    onDelete={() => void save(achievement.facts.filter((f) => f.id !== fact.id)).catch(() => undefined)}
                  />
                ))}
              </ul>
            </Card>
          ) : (
            <Card variant="muted" className="p-5 text-[13px] text-ink-muted">
              No encontramos hechos concretos. Agregá al menos uno para armar los posts.
            </Card>
          )}

          {adding ? (
            <Card className="gap-2 p-4">
              <Textarea
                aria-label="Nuevo hecho"
                value={newFact}
                rows={2}
                autoFocus
                placeholder="Ej: La usaron 40 pacientes en la primera semana."
                onChange={(e) => setNewFact(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="dark"
                  size="sm"
                  disabled={newFact.trim().length < 3 || busy}
                  onClick={() =>
                    save([...achievement.facts, { id: nextId(), category: null, text: newFact.trim(), source: "user" }]).then(
                      () => {
                        setNewFact("")
                        setAdding(false)
                      },
                      () => undefined,
                    )
                  }
                >
                  Agregar
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)} disabled={busy}>
              <Plus aria-hidden /> Agregar un dato
            </Button>
          )}

          {questions.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              <p className="text-[13px] font-medium text-ink-muted">Preguntas para completar tu historia</p>
              {questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  busy={busy}
                  onAnswer={(answer) =>
                    save([...achievement.facts, { id: nextId(), category: null, text: answer, source: "user" }]).then(
                      () => achievementsIndex.dismissQuestion(sessionId, achievement.id, q.id),
                      () => undefined,
                    )
                  }
                  onSkip={() => achievementsIndex.dismissQuestion(sessionId, achievement.id, q.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card variant="muted" className="gap-2 p-5">
            <p className="text-[13px] font-medium text-ink">{achievement.input_type === "audio" ? "Lo que dijiste" : "Lo que escribiste"}</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">“{achievement.transcript}”</p>
          </Card>
          {photo && (
            <Card className="flex-row items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={photo} alt="Foto del proyecto" className="size-14 rounded-xl object-cover" />
              <span>
                <span className="block text-[13px] font-medium text-ink">Foto del proyecto</span>
                <span className="block text-xs text-ink-muted">Va en los dos posts</span>
              </span>
            </Card>
          )}
        </aside>
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-5 mt-8 flex flex-col gap-2 rounded-b-[22px] bg-paper/95 px-5 pt-4 pb-5 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-auto lg:rounded-none lg:border-t lg:border-hairline lg:bg-transparent lg:px-0 lg:py-6 lg:backdrop-blur-none">
        <p aria-live="polite" className="text-right text-xs text-ink-muted">
          {achievement.facts.length === 0
            ? "Agregá al menos un hecho."
            : questions.length > 0
              ? `${questions.length} pregunta${questions.length === 1 ? "" : "s"} sin responder (podés saltearlas).`
              : "Solo usamos lo que aprobás."}
        </p>
        <div className="flex items-center gap-2">
          <Link href="/app/crear" className={cn(buttonStyles({ variant: "ghost" }), "max-sm:px-3")}>
            <ChevronLeft aria-hidden /> Nuevo logro
          </Link>
          <AlertDialog>
            <AlertDialogTrigger className={cn(buttonStyles({ variant: "ghost" }), "text-danger max-sm:px-3")} disabled={busy || remove.isPending}>
              <Trash2 aria-hidden /> <span className="max-sm:sr-only">Borrar</span>
            </AlertDialogTrigger>
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogTitle>¿Borrar este logro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borran sus hechos y sus posts, y sale de tu portfolio. Lo que ya publicaste en tus redes no se toca.
              </AlertDialogDescription>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialogClose>Cancelar</AlertDialogClose>
                <AlertDialogClose
                  value="confirm"
                  className={buttonStyles({ variant: "danger", size: "sm" })}
                  onClick={() => remove.mutateAsync().then(() => router.push("/app"), () => undefined)}
                >
                  Borrar logro
                </AlertDialogClose>
              </div>
            </AlertDialogContent>
          </AlertDialog>
          {achievement.status === "approved" && drafts.ids ? (
            <Link href={`/app/crear/${achievement.id}/publicar`} className={cn(buttonStyles({ size: "lg" }), "ml-auto")}>
              Ver mis posts <Check aria-hidden />
            </Link>
          ) : (
            <Button
              size="lg"
              className="ml-auto"
              disabled={achievement.facts.length === 0 || busy}
              onClick={async () => {
                const done = await approve.mutateAsync().catch(() => null)
                if (done) router.push(`/app/crear/${achievement.id}/publicar`)
              }}
            >
              {approve.isPending ? "Armando tus posts…" : "Aprobar y armar posts"}
              {!approve.isPending && <ArrowRight aria-hidden />}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export function ReviewAchievement() {
  const { id } = useParams<{ id: string }>()
  const { sessionId, isLoading } = useAppSession()
  const query = useAchievement(id, sessionId)

  return (
    <AppPage>
      <CreateSteps current={2} />
      <PageTitle title="Revisá lo que entendimos" lead="Corregí lo que no esté bien. Cada dato muestra la frase tuya de la que sale." />
      {isLoading || query.isPending ? (
        <div className="mt-8">
          <PageSkeleton />
        </div>
      ) : query.data && sessionId ? (
        <ReviewBody achievement={query.data} sessionId={sessionId} />
      ) : (
        <Card variant="muted" className="mt-8 items-start gap-3 p-5">
          <p className="text-sm text-ink">No encontramos este logro.</p>
          <p className="text-[13px] text-ink-muted">Puede ser de otra sesión o haber vencido (duran 24 h).</p>
          <Link href="/app/crear" className={buttonStyles({ variant: "dark", size: "sm" })}>
            Contar un logro
          </Link>
        </Card>
      )}
    </AppPage>
  )
}

import { ChevronRight, MessageSquareQuote, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RoundStatusBadge } from '@/components/oversight/EvaluationResultsView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { RoundForm } from './RoundForm'
import { DEFAULT_QUESTIONS, toInput, toLocalInput } from './roundFormValues'
import { useCreateRound, useEvaluationRounds } from './evaluationsApi'

/**
 * Student course evaluations: QA opens a round, students rate each unit they are on, and QA,
 * faculties and departments read the results. Responses are anonymous by design.
 */
export function EvaluationsPage() {
  const { data: rounds, isPending, error, refetch } = useEvaluationRounds()
  const create = useCreateRound()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const now = new Date()
  const initial = {
    title: '',
    instructions: '',
    opensAt: toLocalInput(now),
    closesAt: toLocalInput(new Date(now.getTime() + 14 * 24 * 3_600_000)),
    minResponses: 3,
    questions: DEFAULT_QUESTIONS,
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          While a round is open, every student can rate each unit they are on, once. Nothing they submit is linked to their name, and a
          unit’s results stay hidden until enough students have answered.
        </p>
        {!creating && <Button type="button" onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> New round</Button>}
      </div>

      {creating && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">New evaluation round</h2>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface" aria-label="Cancel"><X className="size-4" aria-hidden /></button>
          </div>
          <RoundForm
            initial={initial}
            submitLabel="Create round"
            pending={create.isPending}
            onSubmit={(values) => create.mutate(toInput(values), { onSuccess: (round) => navigate(`/qa-evaluations/${round.id}`) })}
          />
          {create.error && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(create.error)}</p>}
        </Card>
      )}

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load evaluation rounds.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !rounds ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : rounds.length === 0 ? (
        <Card className="p-10 text-center">
          <MessageSquareQuote className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No evaluation rounds yet</p>
          <p className="mt-1 text-sm text-muted">Create one to open it to students.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rounds.map((r) => (
            <li key={r.id}>
              <Link to={`/qa-evaluations/${r.id}`} className="block">
                <Card className="flex items-center gap-4 p-5 transition hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">{r.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(r.opensAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} – {new Date(r.closesAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{r.questionCount} question{r.questionCount === 1 ? '' : 's'} · {r.responseCount} response{r.responseCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <RoundStatusBadge status={r.status} />
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { ArrowLeft, Lock, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EvaluationResultsView } from '@/components/oversight/EvaluationResultsView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { EvaluationRoundDetail } from '@/types'
import { TargetFilters, type TargetFilterValues } from '../TargetFilters'
import { RoundForm } from './RoundForm'
import { toInput, toLocalInput } from './roundFormValues'
import { useCloseRound, useDeleteRound, useEvaluationResults, useEvaluationRound, useUpdateRound } from './evaluationsApi'

/** One round: change it, close it, or delete it while nobody has answered, and read its results. */
export function EvaluationDetailPage() {
  const { roundId } = useParams()
  const { data: round, isPending, error, refetch } = useEvaluationRound(roundId)
  const [filters, setFilters] = useState<TargetFilterValues>({})
  const results = useEvaluationResults(roundId, { departmentId: filters.targetDepartmentId })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/qa-evaluations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All rounds
      </Link>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load this round.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !round ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <RoundActions round={round} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TargetFilters value={filters} onChange={setFilters} dates={false} />
          </div>
          {results.error ? (
            <Card className="p-5 text-sm text-danger" role="alert">{errorMessage(results.error, 'Could not load the results.')}</Card>
          ) : results.isPending || !results.data ? (
            <Skeleton className="h-64" />
          ) : (
            <EvaluationResultsView results={results.data} showDepartment />
          )}
        </>
      )}
    </div>
  )
}

function RoundActions({ round }: { round: EvaluationRoundDetail }) {
  const [editing, setEditing] = useState(false)
  const update = useUpdateRound(round.id)
  const close = useCloseRound(round.id)
  const remove = useDeleteRound()
  const navigate = useNavigate()

  if (editing) {
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Edit round</h2>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface" aria-label="Cancel"><X className="size-4" aria-hidden /></button>
        </div>
        <RoundForm
          initial={{
            title: round.title,
            instructions: round.instructions ?? '',
            opensAt: toLocalInput(round.opensAt),
            closesAt: toLocalInput(round.closesAt),
            minResponses: round.minResponses,
            questions: round.questions.map(({ prompt, kind, required }) => ({ prompt, kind, required })),
          }}
          questionsLocked={!round.questionsEditable}
          submitLabel="Save changes"
          pending={update.isPending}
          onSubmit={(values) => {
            const { questions, ...rest } = toInput(values)
            update.mutate(round.questionsEditable ? { ...rest, questions } : rest, { onSuccess: () => setEditing(false) })
          }}
        />
        {update.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(update.error)}</p>}
      </Card>
    )
  }

  return (
    <Card className="flex flex-wrap items-center gap-2 p-4">
      {!round.questionsEditable && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Lock className="size-4" aria-hidden /> Questions fixed: students have answered</span>
      )}
      <span className="flex-1" />
      <Button type="button" variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" aria-hidden /> Edit</Button>
      {round.status !== 'CLOSED' && (
        <Button
          type="button"
          variant="secondary"
          loading={close.isPending}
          onClick={() => { if (window.confirm('Close this round now? Students will no longer be able to answer.')) close.mutate() }}
        >
          Close now
        </Button>
      )}
      {round.questionsEditable && (
        <Button
          type="button"
          variant="danger"
          loading={remove.isPending}
          onClick={() => { if (window.confirm('Delete this round? This cannot be undone.')) remove.mutate(round.id, { onSuccess: () => navigate('/qa-evaluations') }) }}
        >
          <Trash2 className="size-4" aria-hidden /> Delete
        </Button>
      )}
      {(close.error || remove.error) && <p role="alert" className="w-full text-sm text-danger">{errorMessage(close.error ?? remove.error)}</p>}
    </Card>
  )
}

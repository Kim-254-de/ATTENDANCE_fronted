import { ChevronRight, MessageSquareQuote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { EvaluationRound } from '@/types'
import { RoundStatusBadge } from './EvaluationResultsView'

/** Evaluation rounds as a list of links, for the department portal (QA has its own page with create and edit). */
export function EvaluationRoundList({ rounds, isPending, error, refetch, linkTo }: {
  rounds: EvaluationRound[] | undefined
  isPending: boolean
  error: unknown
  refetch: () => void
  linkTo: (roundId: string) => string
}) {
  if (error) {
    return (
      <Card className="flex items-center justify-between p-5" role="alert">
        <p className="text-sm text-danger">{errorMessage(error, 'Could not load course evaluations.')}</p>
        <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
      </Card>
    )
  }
  if (isPending || !rounds) return <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
  if (rounds.length === 0) {
    return (
      <Card className="p-10 text-center">
        <MessageSquareQuote className="mx-auto size-8 text-muted" aria-hidden />
        <p className="mt-3 font-semibold text-ink">No evaluations yet</p>
        <p className="mt-1 text-sm text-muted">Rounds appear here once the QA directorate opens one to students.</p>
      </Card>
    )
  }
  return (
    <ul className="space-y-3">
      {rounds.map((r) => (
        <li key={r.id}>
          <Link to={linkTo(r.id)} className="block">
            <Card className="flex items-center gap-4 p-5 transition hover:shadow-md">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{r.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {new Date(r.opensAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} – {new Date(r.closesAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <RoundStatusBadge status={r.status} />
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}

import clsx from 'clsx'
import { EyeOff, MessageSquareQuote, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { EvaluationQuestion, EvaluationQuestionResult, EvaluationResults, EvaluationRoundStatus } from '@/types'

const STATUS_STYLE: Record<EvaluationRoundStatus, string> = {
  UPCOMING: 'bg-surface text-muted ring-line',
  OPEN: 'bg-success-soft text-success ring-success/30',
  CLOSED: 'bg-line text-ink ring-line',
}
const STATUS_LABEL: Record<EvaluationRoundStatus, string> = { UPCOMING: 'Upcoming', OPEN: 'Open', CLOSED: 'Closed' }

export function RoundStatusBadge({ status }: { status: EvaluationRoundStatus }) {
  return <span className={clsx('inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
}

const formatWindow = (opensAt: string, closesAt: string) => {
  const f = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f(opensAt)} – ${f(closesAt)}`
}

/**
 * One evaluation round's results, shared by the QA, faculty and department portals. Each
 * reader's scope is decided by the backend. A unit below the round's minimum responses shows
 * only its counts: its ratings and comments are withheld so a small class cannot be identified.
 */
export function EvaluationResultsView({ results, showDepartment }: { results: EvaluationResults; showDepartment?: boolean }) {
  const { round } = results
  const rating = round.questions.filter((q) => q.kind === 'RATING')
  const byId = new Map(round.questions.map((q) => [q.id, q]))

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{round.title}</h2>
            <p className="mt-1 text-sm text-muted">{formatWindow(round.opensAt, round.closesAt)} · {results.totalResponses} response{results.totalResponses === 1 ? '' : 's'}</p>
          </div>
          <RoundStatusBadge status={round.status} />
        </div>
        {results.overall.length > 0 ? (
          <div className="mt-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Overall</h3>
            {rating.map((q) => <RatingRow key={q.id} question={q} result={results.overall.find((r) => r.questionId === q.id)} detailed />)}
          </div>
        ) : results.totalResponses > 0 ? (
          <Withheld minResponses={round.minResponses} className="mt-5" />
        ) : null}
      </Card>

      {results.units.length === 0 ? (
        <Card className="p-10 text-center">
          <MessageSquareQuote className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No responses yet</p>
          <p className="mt-1 text-sm text-muted">Results appear here as students evaluate their units.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.units.map((u) => (
            <Card key={`${u.unitId}:${u.lecturerName ?? ''}`} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{u.unitCode}</span>
                  <p className="mt-2 font-semibold text-ink">{u.unitName ?? u.unitCode}</p>
                  <p className="text-sm text-muted">{u.lecturerName ?? 'Former lecturer'}{showDepartment && u.departmentName ? ` · ${u.departmentName}` : ''}</p>
                </div>
                <p className="w-full text-sm text-muted sm:w-auto sm:text-right">
                  <span className="text-ink sm:block sm:text-xl sm:font-bold">{u.responses}<span className="sm:hidden"> response{u.responses === 1 ? '' : 's'}</span></span>
                  {' '}of {u.enrolled} student{u.enrolled === 1 ? '' : 's'}{u.responseRate !== null ? ` (${u.responseRate}%)` : ''}
                </p>
              </div>
              {u.reportable ? (
                <>
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    {rating.map((q) => <RatingRow key={q.id} question={q} result={u.ratings.find((r) => r.questionId === q.id)} />)}
                  </div>
                  {u.comments.length > 0 && (
                    <div className="mt-4 border-t border-line pt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Comments</h4>
                      <ul className="mt-2 space-y-2">
                        {u.comments.map((c, i) => (
                          <li key={i} className="rounded-xl bg-surface px-3 py-2 text-sm text-ink">
                            <span className="block text-xs text-muted">{byId.get(c.questionId)?.prompt}</span>
                            {c.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <Withheld minResponses={round.minResponses} className="mt-4 border-t border-line pt-4" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Withheld({ minResponses, className }: { minResponses: number; className?: string }) {
  return (
    <p className={clsx('flex items-center gap-2 text-sm text-muted', className)}>
      <EyeOff className="size-4 shrink-0" aria-hidden />
      Results are hidden until at least {minResponses} students respond, so nobody can be identified.
    </p>
  )
}

function RatingRow({ question, result, detailed }: { question: EvaluationQuestion; result: EvaluationQuestionResult | undefined; detailed?: boolean }) {
  const average = result?.average ?? null
  const tone = average === null ? 'bg-line' : average >= 4 ? 'bg-success-solid' : average >= 3 ? 'bg-warning-solid' : 'bg-danger-solid'
  return (
    <div>
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="text-ink">{question.prompt}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink">
          <Star className="size-3.5 text-accent" aria-hidden />
          {average === null ? '—' : average.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${question.prompt}: ${average === null ? 'no ratings' : `${average.toFixed(2)} out of 5`}`}>
        <div className={clsx('h-full rounded-full', tone)} style={{ width: `${average === null ? 0 : (average / 5) * 100}%` }} />
      </div>
      {detailed && result && (
        <p className="mt-1 text-xs text-muted">
          {result.distribution.map((n, i) => `${i + 1}★ ${n}`).join(' · ')} — {result.answered} answer{result.answered === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}

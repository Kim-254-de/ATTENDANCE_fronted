import clsx from 'clsx'
import { CheckCircle2, ChevronDown, MessageSquareQuote, ShieldCheck, Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { EvaluationAnswerInput, EvaluationQuestion, StudentEvaluationRound } from '@/types'
import { useMyEvaluations, useSubmitEvaluation } from './evaluationsApi'

const SCALE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']

/**
 * Course evaluations: while the QA directorate has a round open, the student rates each unit
 * they are on, once. Answers are stored with no link to the student.
 */
export function StudentEvaluationsPage() {
  const { data: rounds, isPending, error, refetch } = useMyEvaluations()

  return (
    <div className="space-y-5">
      <Card className="flex items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><ShieldCheck className="size-5" aria-hidden /></span>
        <p className="text-sm text-muted">Anonymous. Your name is never stored with your answers.</p>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load evaluations.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !rounds ? (
        <Skeleton className="h-40" />
      ) : rounds.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquareQuote className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">Nothing to evaluate right now</p>
          <p className="mt-1 text-sm text-muted">You will see your units here when the university opens a course evaluation.</p>
        </Card>
      ) : (
        rounds.map((round) => <RoundSection key={round.id} round={round} />)
      )}
    </div>
  )
}

function RoundSection({ round }: { round: StudentEvaluationRound }) {
  const [openUnitId, setOpenUnitId] = useState<string | null>(round.units.find((u) => !u.submitted)?.unitId ?? null)
  const done = round.units.filter((u) => u.submitted).length
  return (
    <section aria-labelledby={`round-${round.id}`} className="space-y-3">
      <div>
        <h2 id={`round-${round.id}`} className="text-lg font-bold text-ink">{round.title}</h2>
        <p className="text-xs text-muted">
          {done} of {round.units.length} done · closes {new Date(round.closesAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
        {round.instructions && <p className="mt-2 text-sm text-ink">{round.instructions}</p>}
      </div>
      {round.units.map((unit) => (
        <Card key={unit.unitId} className="overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenUnitId((id) => (id === unit.unitId ? null : unit.unitId))}
            disabled={unit.submitted}
            aria-expanded={openUnitId === unit.unitId}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{unit.unitCode}</p>
              <p className="truncate text-xs text-muted">{unit.unitName ?? unit.unitCode} · {unit.lecturerName}</p>
            </div>
            {unit.submitted
              ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 className="size-4" aria-hidden /> Done</span>
              : <ChevronDown className={clsx('size-4 text-muted transition', openUnitId === unit.unitId && 'rotate-180')} aria-hidden />}
          </button>
          {openUnitId === unit.unitId && !unit.submitted && (
            <EvaluationForm roundId={round.id} unitId={unit.unitId} questions={round.questions} onDone={() => setOpenUnitId(round.units.find((u) => !u.submitted && u.unitId !== unit.unitId)?.unitId ?? null)} />
          )}
        </Card>
      ))}
    </section>
  )
}

function EvaluationForm({ roundId, unitId, questions, onDone }: { roundId: string; unitId: string; questions: EvaluationQuestion[]; onDone: () => void }) {
  const submit = useSubmitEvaluation()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})
  const missing = questions.filter((q) => q.required && (q.kind === 'RATING' ? !ratings[q.id] : !(texts[q.id] ?? '').trim()))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (missing.length > 0) return
    const answers = questions.flatMap((q): EvaluationAnswerInput[] => {
      if (q.kind === 'RATING') return ratings[q.id] ? [{ questionId: q.id, rating: ratings[q.id] }] : []
      const text = (texts[q.id] ?? '').trim()
      return text ? [{ questionId: q.id, text }] : []
    })
    submit.mutate({ roundId, unitId, answers }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border-t border-line p-4">
      {questions.map((q, i) => (
        <fieldset key={q.id}>
          <legend className="text-sm font-semibold text-ink">
            {i + 1}. {q.prompt}{!q.required && <span className="font-normal text-muted"> (optional)</span>}
          </legend>
          {q.kind === 'RATING' ? (
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={q.prompt}>
              {SCALE.map((label, idx) => {
                const value = idx + 1
                const selected = ratings[q.id] === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${value} – ${label}`}
                    title={label}
                    onClick={() => setRatings((r) => ({ ...r, [q.id]: value }))}
                    className={clsx(
                      'flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition',
                      selected ? 'border-brand-ink bg-brand text-white' : 'border-line bg-card text-ink hover:bg-brand-soft',
                    )}
                  >
                    {value}<Star className={clsx('size-3.5', selected ? 'text-white' : 'text-accent')} aria-hidden />
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea
              value={texts[q.id] ?? ''}
              onChange={(e) => setTexts((t) => ({ ...t, [q.id]: e.target.value }))}
              maxLength={2000}
              aria-label={q.prompt}
              className="input mt-2 min-h-24 py-2"
            />
          )}
          {q.kind === 'RATING' && <p className="mt-1 flex justify-between text-[11px] text-muted"><span>{SCALE[0]}</span><span>{SCALE[4]}</span></p>}
        </fieldset>
      ))}
      <Button type="submit" className="w-full" loading={submit.isPending} disabled={missing.length > 0}>Submit evaluation</Button>
      {submit.error && <p role="alert" className="text-sm text-danger">{errorMessage(submit.error)}</p>}
    </form>
  )
}

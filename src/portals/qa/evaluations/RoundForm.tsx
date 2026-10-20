import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import type { EvaluationQuestionInput } from '@/types'
import type { RoundFormValues } from './roundFormValues'

/** Create and edit share this form. With `questionsLocked`, the questions are shown but cannot change. */
export function RoundForm({ initial, questionsLocked, submitLabel, pending, onSubmit }: {
  initial: RoundFormValues
  questionsLocked?: boolean
  submitLabel: string
  pending: boolean
  onSubmit: (values: RoundFormValues) => void
}) {
  const [v, setV] = useState(initial)
  const set = (patch: Partial<RoundFormValues>) => setV((prev) => ({ ...prev, ...patch }))
  const setQuestion = (i: number, patch: Partial<EvaluationQuestionInput>) =>
    set({ questions: v.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) })
  const moveQuestion = (i: number, delta: number) => {
    const next = [...v.questions]
    const [q] = next.splice(i, 1)
    next.splice(i + delta, 0, q!)
    set({ questions: next })
  }

  const windowValid = !!v.opensAt && !!v.closesAt && new Date(v.closesAt) > new Date(v.opensAt)
  const valid = v.title.trim().length >= 3 && windowValid && v.questions.length > 0 && v.questions.every((q) => q.prompt.trim().length >= 3)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900 sm:col-span-2">
          Title
          <input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Semester 1 2026/27 course evaluation" className="input" required />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900 sm:col-span-2">
          Note to students (optional)
          <textarea value={v.instructions} onChange={(e) => set({ instructions: e.target.value })} className="input min-h-20 py-2" placeholder="Your answers are anonymous. Lecturers never see who said what." />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
          Opens
          <input type="datetime-local" value={v.opensAt} onChange={(e) => set({ opensAt: e.target.value })} className="input" required />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
          Closes
          <input type="datetime-local" value={v.closesAt} min={v.opensAt} onChange={(e) => set({ closesAt: e.target.value })} className="input" required />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
          Minimum responses before results show
          <input type="number" min={1} max={50} value={v.minResponses} onChange={(e) => set({ minResponses: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} className="input" />
        </label>
      </div>
      {!windowValid && v.opensAt && v.closesAt && <p role="alert" className="text-sm text-red-600">The round must close after it opens.</p>}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-navy-900">Questions</legend>
        {questionsLocked && <p className="text-sm text-muted">Students have already answered, so the questions are fixed.</p>}
        <ol className="space-y-3">
          {v.questions.map((q, i) => (
            <li key={i} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-start gap-2">
                <span className="mt-3 w-5 text-sm font-semibold text-muted">{i + 1}.</span>
                <label className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-0">
                  <span className="sr-only">Question {i + 1}</span>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => setQuestion(i, { prompt: e.target.value })}
                    disabled={questionsLocked}
                    maxLength={300}
                    className="input h-auto min-h-11 resize-none py-2 field-sizing-content"
                  />
                </label>
                <label className="pl-7 sm:pl-0">
                  <span className="sr-only">Question {i + 1} type</span>
                  <select value={q.kind} onChange={(e) => setQuestion(i, { kind: e.target.value as EvaluationQuestionInput['kind'] })} disabled={questionsLocked} className="input w-auto">
                    <option value="RATING">Rating 1–5</option>
                    <option value="TEXT">Comment</option>
                  </select>
                </label>
              </div>
              {!questionsLocked && (
                <div className="mt-2 flex flex-wrap items-center gap-3 pl-7 text-sm">
                  <label className="inline-flex items-center gap-2 text-navy-900">
                    <input type="checkbox" checked={q.required} onChange={(e) => setQuestion(i, { required: e.target.checked })} className="size-4 accent-navy-900" />
                    Required
                  </label>
                  <span className="flex-1" />
                  <button type="button" onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-muted hover:bg-surface disabled:opacity-30" aria-label={`Move question ${i + 1} up`}><ArrowUp className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => moveQuestion(i, 1)} disabled={i === v.questions.length - 1} className="rounded-lg p-1.5 text-muted hover:bg-surface disabled:opacity-30" aria-label={`Move question ${i + 1} down`}><ArrowDown className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => set({ questions: v.questions.filter((_, j) => j !== i) })} disabled={v.questions.length === 1} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label={`Remove question ${i + 1}`}><Trash2 className="size-4" aria-hidden /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
        {!questionsLocked && v.questions.length < 30 && (
          <Button type="button" variant="secondary" onClick={() => set({ questions: [...v.questions, { prompt: '', kind: 'RATING', required: true }] })}>
            <Plus className="size-4" aria-hidden /> Add question
          </Button>
        )}
      </fieldset>

      <Button type="submit" loading={pending} disabled={!valid}>{submitLabel}</Button>
    </form>
  )
}

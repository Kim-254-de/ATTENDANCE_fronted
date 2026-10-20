import type { EvaluationQuestionInput, EvaluationRoundInput } from '@/types'

/**
 * What a new round starts with: the questions most course evaluation forms ask. QA edits them
 * freely until the first student answers.
 */
export const DEFAULT_QUESTIONS: EvaluationQuestionInput[] = [
  { prompt: 'The lecturer explained the material clearly.', kind: 'RATING', required: true },
  { prompt: 'The lecturer came to every scheduled class on time.', kind: 'RATING', required: true },
  { prompt: 'The unit was well organised and followed its outline.', kind: 'RATING', required: true },
  { prompt: 'Assessments were fair and marked work came back with useful feedback.', kind: 'RATING', required: true },
  { prompt: 'Overall, I would recommend this unit to other students.', kind: 'RATING', required: true },
  { prompt: 'What should the lecturer keep doing, or change?', kind: 'TEXT', required: false },
]

/** "2026-10-19T09:00" in local time, for a datetime-local input. */
export const toLocalInput = (iso: string | Date) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface RoundFormValues {
  title: string
  instructions: string
  opensAt: string
  closesAt: string
  minResponses: number
  questions: EvaluationQuestionInput[]
}

export const toInput = (v: RoundFormValues): EvaluationRoundInput => ({
  title: v.title.trim(),
  instructions: v.instructions.trim() || undefined,
  opensAt: new Date(v.opensAt).toISOString(),
  closesAt: new Date(v.closesAt).toISOString(),
  minResponses: v.minResponses,
  questions: v.questions.map((q) => ({ ...q, prompt: q.prompt.trim() })),
})

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EvaluationAnswerInput, StudentEvaluationRound } from '@/types'

const MY_EVALUATIONS_KEY = ['students', 'me', 'evaluations'] as const

/** Open course evaluation rounds, each with the student's units and which they have already evaluated. */
export const useMyEvaluations = () =>
  useQuery({
    queryKey: MY_EVALUATIONS_KEY,
    queryFn: async () => (await api.get<StudentEvaluationRound[]>('/students/me/evaluations')).data,
    staleTime: 60_000,
  })

/** Units still waiting for this student's evaluation, across every open round. */
export const usePendingEvaluationCount = () => {
  const { data } = useMyEvaluations()
  return data?.reduce((n, r) => n + r.units.filter((u) => !u.submitted).length, 0) ?? 0
}

/** Submits one unit's evaluation. Anonymous: the server keeps only that it was done, apart from what was said. */
export const useSubmitEvaluation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ roundId, unitId, answers }: { roundId: string; unitId: string; answers: EvaluationAnswerInput[] }) => {
      await api.post(`/students/me/evaluations/${roundId}/units/${unitId}`, { answers })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_EVALUATIONS_KEY }),
  })
}

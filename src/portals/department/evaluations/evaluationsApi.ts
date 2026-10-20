import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EvaluationResults, EvaluationRound } from '@/types'

/** Course evaluation rounds that have opened to students. */
export const useDepartmentEvaluations = () =>
  useQuery({
    queryKey: ['department', 'evaluations'],
    queryFn: async () => (await api.get<EvaluationRound[]>('/departments/evaluations')).data,
    staleTime: 60_000,
  })

/** One round's results for the department's units. */
export const useDepartmentEvaluationResults = (roundId: string | undefined) =>
  useQuery({
    queryKey: ['department', 'evaluations', roundId],
    queryFn: async () => (await api.get<EvaluationResults>(`/departments/evaluations/${roundId}`)).data,
    enabled: !!roundId,
    staleTime: 60_000,
  })

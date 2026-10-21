import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EvaluationResults, EvaluationRound } from '@/types'

/** Course evaluation rounds that have opened to students. */
export const useFacultyEvaluations = () =>
  useQuery({
    queryKey: ['faculty', 'evaluations'],
    queryFn: async () => (await api.get<EvaluationRound[]>('/faculties/evaluations')).data,
    staleTime: 60_000,
  })

/** One round's results across the faculty's units, or one department's. */
export const useFacultyEvaluationResults = (roundId: string | undefined, departmentId?: string) =>
  useQuery({
    queryKey: ['faculty', 'evaluations', roundId, departmentId ?? null],
    queryFn: async () =>
      (await api.get<EvaluationResults>(`/faculties/evaluations/${roundId}`, { params: departmentId ? { departmentId } : {} })).data,
    enabled: !!roundId,
    staleTime: 60_000,
  })

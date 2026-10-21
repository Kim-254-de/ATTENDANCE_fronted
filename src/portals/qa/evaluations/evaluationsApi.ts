import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EvaluationResults, EvaluationRound, EvaluationRoundDetail, EvaluationRoundInput } from '@/types'

const ROUNDS_KEY = ['qa', 'evaluations'] as const

export const useEvaluationRounds = () =>
  useQuery({
    queryKey: ROUNDS_KEY,
    queryFn: async () => (await api.get<EvaluationRound[]>('/quality-assurance/evaluations')).data,
    staleTime: 30_000,
  })

export const useEvaluationRound = (roundId: string | undefined) =>
  useQuery({
    queryKey: [...ROUNDS_KEY, roundId],
    queryFn: async () => (await api.get<EvaluationRoundDetail>(`/quality-assurance/evaluations/${roundId}`)).data,
    enabled: !!roundId,
    staleTime: 30_000,
  })

export const useEvaluationResults = (roundId: string | undefined, filters: { departmentId?: string; facultyId?: string }) =>
  useQuery({
    queryKey: [...ROUNDS_KEY, roundId, 'results', filters],
    queryFn: async () =>
      (await api.get<EvaluationResults>(`/quality-assurance/evaluations/${roundId}/results`, {
        params: { ...(filters.departmentId ? { departmentId: filters.departmentId } : {}), ...(filters.facultyId ? { facultyId: filters.facultyId } : {}) },
      })).data,
    enabled: !!roundId,
    staleTime: 30_000,
  })

export const useCreateRound = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: EvaluationRoundInput) => (await api.post<EvaluationRoundDetail>('/quality-assurance/evaluations', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ROUNDS_KEY }),
  })
}

export const useUpdateRound = (roundId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<EvaluationRoundInput>) =>
      (await api.patch<EvaluationRoundDetail>(`/quality-assurance/evaluations/${roundId}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ROUNDS_KEY }),
  })
}

export const useCloseRound = (roundId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<EvaluationRoundDetail>(`/quality-assurance/evaluations/${roundId}/close`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ROUNDS_KEY }),
  })
}

export const useDeleteRound = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (roundId: string) => { await api.delete(`/quality-assurance/evaluations/${roundId}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ROUNDS_KEY }),
  })
}

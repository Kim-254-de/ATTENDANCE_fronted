import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { QaStandard, QaStandardCategory } from '@/types'

const STANDARDS_KEY = ['qa', 'standards'] as const

/** The full standards catalog. No delete endpoint — a standard is deactivated, never removed. */
export const useQaStandards = () =>
  useQuery({
    queryKey: STANDARDS_KEY,
    queryFn: async () => (await api.get<QaStandard[]>('/quality-assurance/standards')).data,
    staleTime: 60_000,
  })

export interface CreateStandardInput {
  code: string
  category: QaStandardCategory
  title: string
  description?: string
  displayOrder?: number
}

export const useCreateStandard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateStandardInput) => (await api.post<QaStandard>('/quality-assurance/standards', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: STANDARDS_KEY }),
  })
}

/** Toggles isActive — the only update exposed in this UI; other fields are edited directly against the API if ever needed. */
export const useSetStandardActive = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<QaStandard>(`/quality-assurance/standards/${id}`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: STANDARDS_KEY }),
  })
}

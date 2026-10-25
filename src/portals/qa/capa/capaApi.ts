import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { QaCapaStatus, QaCorrectiveAction } from '@/types'

export interface CapaFilters {
  status?: QaCapaStatus
  ownerUserId?: string
  targetDepartmentId?: string
  overdue?: boolean
}

const capaListKey = (filters: CapaFilters = {}) => ['qa', 'corrective-actions', filters] as const

export const useCorrectiveActions = (filters: CapaFilters = {}) =>
  useQuery({
    queryKey: capaListKey(filters),
    queryFn: async () =>
      (await api.get<QaCorrectiveAction[]>('/quality-assurance/corrective-actions', { params: { ...filters, overdue: filters.overdue === undefined ? undefined : String(filters.overdue) } })).data,
    staleTime: 30_000,
  })

export interface CreateCapaInput {
  findingId: string
  description: string
  ownerUserId: string
  dueDate: string
}

export const useCreateCapa = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCapaInput) => (await api.post<QaCorrectiveAction>('/quality-assurance/corrective-actions', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa', 'corrective-actions'] }),
  })
}

/**
 * Field edits and/or a forward-only status transition (OPEN -> IN_PROGRESS ->
 * VERIFIED -> CLOSED). The backend stamps verifiedByUserId/verifiedAt from
 * the signed-in caller on the VERIFIED move — nothing here can set that.
 */
export const useUpdateCapa = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; description?: string; ownerUserId?: string; dueDate?: string; status?: QaCapaStatus }) =>
      (await api.patch<QaCorrectiveAction>(`/quality-assurance/corrective-actions/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa', 'corrective-actions'] }),
  })
}

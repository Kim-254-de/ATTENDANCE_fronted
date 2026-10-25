import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { QaDashboard } from '@/types'

export interface DashboardFilters {
  targetDepartmentId?: string
  from?: string
  to?: string
  groupBy?: 'week' | 'month'
}

/** Audit completion, compliance by standard/category, overdue CAPA count, and the attendance-rate trend. */
export const useQaDashboard = (filters: DashboardFilters = {}) =>
  useQuery({
    queryKey: ['qa', 'dashboard', filters],
    queryFn: async () => (await api.get<QaDashboard>('/quality-assurance/dashboard', { params: filters })).data,
    staleTime: 60_000,
  })

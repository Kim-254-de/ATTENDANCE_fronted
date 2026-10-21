import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EligibilityReport } from '@/types'

/** Exam eligibility across the faculty's units, or one of its departments'. */
export const useFacultyEligibility = (filters: { all: boolean; departmentId?: string }) =>
  useQuery({
    queryKey: ['faculty', 'eligibility', filters],
    queryFn: async () =>
      (await api.get<EligibilityReport>('/faculties/eligibility', {
        params: { ...(filters.all ? { all: 'true' } : {}), ...(filters.departmentId ? { departmentId: filters.departmentId } : {}) },
      })).data,
    staleTime: 60_000,
  })

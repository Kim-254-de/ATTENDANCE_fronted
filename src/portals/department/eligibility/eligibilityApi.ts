import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EligibilityReport } from '@/types'

/** Students below, or close to, the minimum attendance on the department's units. `all` includes everyone. */
export const useDepartmentEligibility = (all: boolean) =>
  useQuery({
    queryKey: ['department', 'eligibility', { all }],
    queryFn: async () => (await api.get<EligibilityReport>('/departments/eligibility', { params: all ? { all: 'true' } : {} })).data,
    staleTime: 60_000,
  })

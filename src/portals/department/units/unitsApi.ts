import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DepartmentUnit } from '@/types'

/** Every unit taught in the department, with who teaches it and how it is attended. */
export const useDepartmentUnits = () =>
  useQuery({
    queryKey: ['department', 'units'],
    queryFn: async () => (await api.get<DepartmentUnit[]>('/departments/units')).data,
    staleTime: 5 * 60_000,
  })

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FacultyUnit } from '@/types'

/** Every unit taught across the faculty, with who teaches it, which department, and how it is attended. */
export const useFacultyUnits = () =>
  useQuery({
    queryKey: ['faculty', 'units'],
    queryFn: async () => (await api.get<FacultyUnit[]>('/faculties/units')).data,
    staleTime: 5 * 60_000,
  })

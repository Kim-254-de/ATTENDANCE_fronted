import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LecturerStudent } from '@/types'

/**
 * Every student on every unit in the department — one row per (student, unit),
 * the same shape the lecturer portal's own students list uses, so the two
 * tables read identically.
 */
export const useDepartmentStudents = () =>
  useQuery({
    queryKey: ['department', 'students'],
    queryFn: async () => (await api.get<LecturerStudent[]>('/departments/students')).data,
    staleTime: 60_000,
  })

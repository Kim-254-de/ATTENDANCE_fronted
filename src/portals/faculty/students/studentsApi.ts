import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FacultyStudent } from '@/types'

/** Every student on every unit across the faculty — one row per (student, unit), with department named. */
export const useFacultyStudents = () =>
  useQuery({
    queryKey: ['faculty', 'students'],
    queryFn: async () => (await api.get<FacultyStudent[]>('/faculties/students')).data,
    staleTime: 60_000,
  })

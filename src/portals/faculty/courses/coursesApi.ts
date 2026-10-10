import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FacultyCourse } from '@/types'

/** Every course offering across every department in the faculty, with department named. */
export const useFacultyCourses = () =>
  useQuery({
    queryKey: ['faculty', 'courses'],
    queryFn: async () => (await api.get<FacultyCourse[]>('/faculties/courses')).data,
    staleTime: 30_000,
  })

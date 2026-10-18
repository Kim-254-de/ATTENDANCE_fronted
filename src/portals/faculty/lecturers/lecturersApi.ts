import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FacultyLecturer, FacultyLecturerDetail } from '@/types'

/**
 * Every lecturer across every department in the faculty, with their teaching
 * load and attendance/punctuality standing. No field-mapping layer here,
 * unlike the department module's equivalent — these types already mirror the
 * backend's real response shape field-for-field.
 */
export const useFacultyLecturers = () =>
  useQuery({
    queryKey: ['faculty', 'lecturers'],
    queryFn: async () => (await api.get<FacultyLecturer[]>('/faculties/lecturers')).data,
    staleTime: 60_000,
  })

/** One lecturer's drill-down: their department, per-unit attendance and recent sessions' timekeeping. */
export const useFacultyLecturer = (lecturerUserId: string | undefined) =>
  useQuery({
    queryKey: ['faculty', 'lecturers', lecturerUserId],
    queryFn: async () => (await api.get<FacultyLecturerDetail>(`/faculties/lecturers/${lecturerUserId}`)).data,
    enabled: !!lecturerUserId,
    staleTime: 60_000,
  })

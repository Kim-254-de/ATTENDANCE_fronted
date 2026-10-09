import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DepartmentLecturer, DepartmentLecturerDetail, DepartmentTimekeepingEntry } from '@/types'

/** Every lecturer in the department, with their teaching load and attendance/punctuality standing. */
export const useDepartmentLecturers = () =>
  useQuery({
    queryKey: ['department', 'lecturers'],
    queryFn: async () => (await api.get<DepartmentLecturer[]>('/departments/lecturers')).data,
    staleTime: 60_000,
  })

/** One lecturer's drill-down: per-unit attendance plus their recent sessions' timekeeping. */
export const useDepartmentLecturer = (lecturerUserId: string | undefined) =>
  useQuery({
    queryKey: ['department', 'lecturers', lecturerUserId],
    queryFn: async () => (await api.get<DepartmentLecturerDetail>(`/departments/lecturers/${lecturerUserId}`)).data,
    enabled: !!lecturerUserId,
    staleTime: 60_000,
  })

export interface TimekeepingFilters {
  lecturerUserId?: string
  unitId?: string
  limit?: number
}

/** Recent sessions across the department, newest first — scheduled start against when it actually opened. */
export const useTimekeeping = (filters: TimekeepingFilters = {}) =>
  useQuery({
    queryKey: ['department', 'timekeeping', filters],
    queryFn: async () =>
      (await api.get<DepartmentTimekeepingEntry[]>('/departments/timekeeping', { params: filters })).data,
    staleTime: 60_000,
  })

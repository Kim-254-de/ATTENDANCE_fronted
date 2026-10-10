import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FacultyDepartment, FacultyDepartmentDetail } from '@/types'

/** Every department in the faculty, with its own load, attendance and punctuality — comparable side by side. */
export const useFacultyDepartments = () =>
  useQuery({
    queryKey: ['faculty', 'departments'],
    queryFn: async () => (await api.get<FacultyDepartment[]>('/faculties/departments')).data,
    staleTime: 60_000,
  })

/** One department's drill-down: its own lecturers and units. */
export const useFacultyDepartment = (departmentId: string | undefined) =>
  useQuery({
    queryKey: ['faculty', 'departments', departmentId],
    queryFn: async () => (await api.get<FacultyDepartmentDetail>(`/faculties/departments/${departmentId}`)).data,
    enabled: !!departmentId,
    staleTime: 60_000,
  })

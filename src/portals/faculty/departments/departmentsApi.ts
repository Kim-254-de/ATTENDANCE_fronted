import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateDepartmentResult, FacultyDepartment, FacultyDepartmentDetail, ProvidedCourse } from '@/types'

const DEPARTMENTS_KEY = ['faculty', 'departments'] as const

/** Every department in the faculty, with its own load, attendance and punctuality — comparable side by side. */
export const useFacultyDepartments = () =>
  useQuery({
    queryKey: DEPARTMENTS_KEY,
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

/** Creates a department in the caller's own faculty. */
export const useCreateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => (await api.post<CreateDepartmentResult>('/faculties/departments', { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
  })
}

/** Provides a course to one of the caller's own departments — manually entered, no lecturer yet. */
export const useProvideCourse = (departmentId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { code: string; name?: string }) =>
      (await api.post<ProvidedCourse>(`/faculties/departments/${departmentId}/courses`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'departments', departmentId] }),
  })
}

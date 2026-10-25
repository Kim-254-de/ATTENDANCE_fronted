import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ManagementDepartmentYears, ManagementUniversity, ManagementYearDetail } from '@/types'

/** Every department in the university, with its check-ins and attendance rate. */
export const useUniversity = () =>
  useQuery({
    queryKey: ['management', 'departments'],
    queryFn: async () => (await api.get<ManagementUniversity>('/management/departments')).data,
    staleTime: 60_000,
  })

/** One department's Years 1–4. */
export const useDepartmentYears = (departmentId: string | undefined) =>
  useQuery({
    queryKey: ['management', 'departments', departmentId],
    queryFn: async () => (await api.get<ManagementDepartmentYears>(`/management/departments/${departmentId}`)).data,
    enabled: !!departmentId,
    staleTime: 60_000,
  })

/**
 * One year of a department: its units, each with its lecturer and students.
 * The unit page reads its unit out of this same response, so opening a unit
 * from its year costs no second request.
 */
export const useYearUnits = (departmentId: string | undefined, year: number | undefined) =>
  useQuery({
    queryKey: ['management', 'departments', departmentId, 'years', year],
    queryFn: async () => (await api.get<ManagementYearDetail>(`/management/departments/${departmentId}/years/${year}`)).data,
    enabled: !!departmentId && !!year,
    staleTime: 60_000,
  })

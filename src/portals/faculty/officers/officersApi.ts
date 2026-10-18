import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InvitationResult, Officer } from '@/types'

export const FACULTY_OFFICERS_KEY = ['faculty', 'officers'] as const

/** The department officers of this faculty's departments, invited or active. */
export const useDepartmentOfficers = () =>
  useQuery({
    queryKey: FACULTY_OFFICERS_KEY,
    queryFn: async () => (await api.get<Officer[]>('/faculties/officers')).data,
    staleTime: 30_000,
  })

/** Invites the officer for one of this faculty's departments. */
export const useInviteDepartmentOfficer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ departmentId, ...invitee }: { departmentId: string; fullName: string; email: string }) =>
      (await api.post<InvitationResult>(`/faculties/departments/${departmentId}/officers`, invitee)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: FACULTY_OFFICERS_KEY }),
  })
}

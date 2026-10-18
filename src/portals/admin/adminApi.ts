import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminFaculty, InvitationResult, Officer } from '@/types'

export const ADMIN_OFFICERS_KEY = ['admin', 'officers'] as const
const FACULTIES_KEY = ['admin', 'faculties'] as const

/** Every administrator, faculty officer and department officer, with invitation status. */
export const useAdminOfficers = () =>
  useQuery({
    queryKey: ADMIN_OFFICERS_KEY,
    queryFn: async () => (await api.get<Officer[]>('/admin/officers')).data,
    staleTime: 30_000,
  })

export const useAdminFaculties = () =>
  useQuery({
    queryKey: FACULTIES_KEY,
    queryFn: async () => (await api.get<AdminFaculty[]>('/admin/faculties')).data,
    staleTime: 60_000,
  })

export const useCreateFaculty = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => (await api.post<{ facultyId: string; name: string }>('/admin/faculties', { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: FACULTIES_KEY }),
  })
}

export type AdminInvitation =
  | { role: 'admin'; fullName: string; email: string }
  | { role: 'faculty'; fullName: string; email: string; facultyId: string }

/** Invites an administrator, or a faculty officer for one faculty. */
export const useAdminInvite = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdminInvitation) => (await api.post<InvitationResult>('/admin/invitations', input)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_OFFICERS_KEY })
      await qc.invalidateQueries({ queryKey: FACULTIES_KEY })
    },
  })
}

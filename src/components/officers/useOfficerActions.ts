import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InvitationResult } from '@/types'

/**
 * Re-send and deactivate, for the administrator's officer list
 * (`/admin/officers`). Refetches `listKey` afterwards.
 */
export function useOfficerActions(base: '/admin/officers', listKey: readonly unknown[]) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: listKey })
  const resend = useMutation({
    mutationFn: async (userId: string) => (await api.post<InvitationResult>(`${base}/${userId}/resend`)).data,
    onSuccess: refresh,
  })
  const deactivate = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`${base}/${userId}/deactivate`)
    },
    onSuccess: refresh,
  })
  return { resend, deactivate }
}

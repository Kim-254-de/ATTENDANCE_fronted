import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FaceCheckInResult, FaceEnrollmentResult, FaceIdentifyResult } from '@/types'

/**
 * Face check-in on the lecturer's phone (backend: src/modules/verification).
 * Identify only says who it is; the lecturer's Confirm is what records them.
 */
export const useIdentifyFace = (sessionId: string | undefined) =>
  useMutation({
    mutationFn: async (image: string) =>
      (await api.post<FaceIdentifyResult>(`/sessions/${sessionId}/face/identify`, { image })).data,
  })

export const useConfirmFace = (sessionId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (matchToken: string) =>
      (await api.post<FaceCheckInResult>(`/sessions/${sessionId}/face/confirm`, { matchToken })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions', sessionId] }),
  })
}

/** Registers a student's face from three photos. The student must have turned face check-in on first. */
export const useEnrollFace = (unitId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentUserId, images }: { studentUserId: string; images: string[] }) =>
      (await api.post<FaceEnrollmentResult>(`/units/${unitId}/students/${studentUserId}/face`, { images })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units', unitId, 'students'] }),
  })
}

export const useRemoveFaceEnrollment = (unitId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (studentUserId: string) =>
      (await api.delete<{ removed: boolean }>(`/units/${unitId}/students/${studentUserId}/face`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units', unitId, 'students'] }),
  })
}

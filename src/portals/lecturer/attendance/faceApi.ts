import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import type { FaceCheckInResult, FaceEnrollmentResult, FaceIdentifyResult } from '@/types'

/**
 * Face check-in on the lecturer's phone (backend: src/modules/verification).
 * Identify only says who it is; the lecturer's Confirm is what records them.
 */

/**
 * Photos go to a face service that may be waking from sleep (~20-30 s on
 * Render's free plan); the backend retries while it wakes, so these requests
 * get longer than the API's usual 15 s.
 */
const FACE_TIMEOUT_MS = 60_000

/**
 * Asks the backend to wake the face service as soon as the terminal or the
 * register-face dialog opens, so it is up by the time the first photo is taken.
 * Fire and forget: if it fails, the photo request still waits for the wake-up.
 */
export function useWarmUpFaceService() {
  useEffect(() => {
    api.post('/face/warm-up').catch(() => undefined)
  }, [])
}
export const useIdentifyFace = (sessionId: string | undefined) =>
  useMutation({
    mutationFn: async (image: string) =>
      (await api.post<FaceIdentifyResult>(`/sessions/${sessionId}/face/identify`, { image }, { timeout: FACE_TIMEOUT_MS })).data,
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
      (await api.post<FaceEnrollmentResult>(`/units/${unitId}/students/${studentUserId}/face`, { images }, { timeout: FACE_TIMEOUT_MS })).data,
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

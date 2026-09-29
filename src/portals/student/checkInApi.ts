import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import type { CheckInResult } from '@/types'

/**
 * The lecturer's projected QR code carries `v1.<sessionId>.<counter>.<signature>`
 * (backend: src/modules/session/session.token.ts). Anything else the camera
 * happens to read — a poster, a Wi-Fi code — is rejected here without a
 * round trip, so a stray code never costs the student a failed attempt.
 */
export const looksLikeAttendanceCode = (text: string) => /^v\d+\.[0-9a-f-]{36}\.\d+\.\S+$/i.test(text.trim())

/**
 * A scanned code, submitted for check-in. The backend verifies everything; nothing is trusted here.
 * On success the student's units and history are refetched, so the dashboard shows the new
 * attendance at once instead of a cached rate.
 */
export const useCheckIn = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: string) =>
      (await api.post<CheckInResult>('/attendance/check-in', { payload: payload.trim() })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students', 'me'] }),
  })
}

/**
 * How a failed check-in should be handled on screen:
 * - `rescan`: the code was stale or not quite right — scanning the screen again fixes it.
 * - `done`: already recorded — nothing more to do.
 * - `stop`: scanning again won't help (not on the unit, class closed or paused, signed out ...).
 */
export type CheckInFailureKind = 'rescan' | 'done' | 'stop'

export function checkInFailureKind(error: unknown): CheckInFailureKind {
  if (!(error instanceof AxiosError) || !error.response) return 'rescan' // network blip: try again
  const { status } = error.response
  const message = (error.response.data as { message?: string } | undefined)?.message ?? ''
  if (status === 410 || status === 400) return 'rescan' // expired, not yet valid, or not a valid code
  if (status === 409 && /already been recorded/i.test(message)) return 'done'
  return 'stop'
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateSessionInput, CurrentQr, DeviceLocation, SessionAttendance, SessionStatus, SessionSummary } from '@/types'

export const useCreateSession = () =>
  useMutation({
    mutationFn: async (input: CreateSessionInput) => (await api.post<SessionSummary>('/sessions', input)).data,
  })

/**
 * The code to show right now. Nothing is written server-side per rotation, so
 * polling is cheap — we just re-ask exactly when the current code expires
 * rather than on a fixed timer, which keeps the screen in lock-step with the
 * server's rotation window instead of drifting.
 */
export const useSessionQr = (sessionId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: ['sessions', sessionId, 'qr'],
    queryFn: async () => (await api.get<CurrentQr>(`/sessions/${sessionId}/qr`)).data,
    enabled: enabled && !!sessionId,
    // While the class waits for the lecturer's phone to send its location, ask
    // every few seconds so the code appears as soon as it arrives.
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 5_000
      if (data.session.geofence.mode === 'AWAITING_LOCATION') return 3_000
      return data.expiresInSeconds * 1000
    },
    refetchOnWindowFocus: false,
    retry: false,
  })

/** Who has checked in so far. Polled while the class is live so names appear as students scan. */
export const useSessionAttendance = (sessionId: string | undefined, live: boolean) =>
  useQuery({
    queryKey: ['sessions', sessionId, 'attendance'],
    queryFn: async () => (await api.get<SessionAttendance>(`/attendance/sessions/${sessionId}`)).data,
    enabled: !!sessionId,
    refetchInterval: live ? 5_000 : false,
    refetchOnWindowFocus: false,
  })

export const useSetSessionStatus = (sessionId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: SessionStatus) =>
      (await api.patch<SessionSummary>(`/sessions/${sessionId}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions', sessionId, 'qr'] }),
  })
}

/**
 * The lecturer's classes still open, on whichever device activated them. This
 * is how their phone finds the class their laptop is showing, and how any
 * device finds its way back to a running class.
 */
export const useLiveSessions = (poll = true) =>
  useQuery({
    queryKey: ['sessions', 'live'],
    queryFn: async () => (await api.get<SessionSummary[]>('/sessions/live')).data,
    refetchInterval: poll ? 10_000 : false,
  })

/**
 * Centres the class's location check on this device's position, or switches
 * the check off. A phone uses this for a class its laptop opened
 * AWAITING_LOCATION; it also re-centres a running class.
 */
export const useSetGeofence = (sessionId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { mode: 'ON'; location?: DeviceLocation } | { mode: 'OFF' }) =>
      (await api.patch<SessionSummary>(`/sessions/${sessionId}/geofence`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

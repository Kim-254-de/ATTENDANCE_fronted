import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateSessionInput, CurrentQr, SessionStatus, SessionSummary } from '@/types'

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
    refetchInterval: (query) => (query.state.data ? query.state.data.expiresInSeconds * 1000 : 5_000),
    refetchOnWindowFocus: false,
    retry: false,
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
 * The dashboard has no "list my open sessions" endpoint to check against, so
 * remembering the last activated session locally is what lets a lecturer who
 * navigated away find their way back to a still-running class.
 */
const ACTIVE_SESSION_KEY = 'attendance:activeSessionId'

export const getActiveSessionId = () => (typeof localStorage === 'undefined' ? null : localStorage.getItem(ACTIVE_SESSION_KEY))
export const setActiveSessionId = (id: string) => localStorage.setItem(ACTIVE_SESSION_KEY, id)
export const clearActiveSessionId = () => localStorage.removeItem(ACTIVE_SESSION_KEY)

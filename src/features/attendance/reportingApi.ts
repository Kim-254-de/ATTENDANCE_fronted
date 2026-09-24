import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { env } from '@/lib/env'
import type { RecentSession } from '@/types'

/** The full session log for the Attendance page — same shape and endpoint as the Dashboard's "Recent Sessions", no limit. */
export const useSessionReports = (unitId?: string) =>
  useQuery({
    queryKey: ['lecturer', 'sessions', 'reports', unitId ?? 'all'],
    queryFn: async () => (await api.get<RecentSession[]>('/reports/sessions', { params: unitId ? { unitId } : undefined })).data,
    refetchInterval: 60_000,
  })

/**
 * A plain URL, not a mutation — the browser's own navigation (via an <a href>)
 * handles the download using the Content-Disposition header the backend
 * sends, with the same-origin session cookie attached automatically.
 */
export const sessionExportUrl = (sessionId: string) => `${env.apiUrl}/reports/sessions/${sessionId}/export`

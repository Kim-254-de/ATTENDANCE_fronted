import { useMemo } from 'react'
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

/** Text/bar colour for an attendance rate, from red (low) through gold to green (high). */
export function rateColour(rate: number) {
  if (rate >= 90) return { text: 'text-success', bar: 'bg-success' }
  if (rate >= 70) return { text: 'text-gold-500', bar: 'bg-gold-500' }
  return { text: 'text-red-600', bar: 'bg-red-600' }
}

/** Each taught unit's semester-to-date average attendance rate, derived from the session log. */
export const useUnitAttendanceRates = () => {
  const { data: sessions } = useSessionReports()
  return useMemo(() => {
    const byUnit = new Map<string, number[]>()
    for (const s of sessions ?? []) {
      if (!byUnit.has(s.unitId)) byUnit.set(s.unitId, [])
      byUnit.get(s.unitId)!.push(s.rate)
    }
    return new Map([...byUnit].map(([id, rates]) => [id, rates.reduce((a, b) => a + b, 0) / rates.length]))
  }, [sessions])
}

/**
 * A plain URL, not a mutation — the browser's own navigation (via an <a href>)
 * handles the download using the Content-Disposition header the backend
 * sends, with the same-origin session cookie attached automatically.
 */
export const sessionExportUrl = (sessionId: string) => `${env.apiUrl}/reports/sessions/${sessionId}/export`

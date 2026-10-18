import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LecturerStudent, Overview, RecentSession, Unit } from '@/types'

/**
 * Real backend data: units taught, total students, avg. attendance, sessions
 * held. Powers both the Dashboard's stat cards and the Profile page's
 * teaching summary. Note the plural `/lecturers` — this previously pointed at
 * the singular `/lecturer/overview`, which the backend's lecturer router was
 * never actually mounted at, so this endpoint was unreachable until now.
 */
export const useOverview = () =>
  useQuery({
    queryKey: ['lecturer', 'overview'],
    queryFn: async () => (await api.get<Overview>('/lecturers/overview')).data,
    refetchInterval: 60_000,
  })

/** The Students page: every student across every unit this lecturer teaches, with their real per-unit attendance rate. */
export const useLecturerStudents = () =>
  useQuery({
    queryKey: ['lecturer', 'students'],
    queryFn: async () => (await api.get<LecturerStudent[]>('/lecturers/students')).data,
    staleTime: 60_000,
  })

export const useUnits = () =>
  useQuery({
    queryKey: ['lecturer', 'units'],
    queryFn: async () => (await api.get<Unit[]>('/lecturer/units')).data,
    staleTime: 5 * 60_000,
  })

/**
 * Real backend data (GET /reports/sessions) — same singular/plural bug class
 * as useOverview: this used to call /lecturer/sessions/recent, which the
 * backend never served.
 */
export const useRecentSessions = (limit = 5) =>
  useQuery({
    queryKey: ['lecturer', 'sessions', 'recent', limit],
    queryFn: async () => {
      const sessions = (await api.get<RecentSession[]>('/reports/sessions')).data
      return latestSessionsPerUnit(sessions).slice(0, limit)
    },
    refetchInterval: 60_000,
  })

function latestSessionsPerUnit(sessions: RecentSession[]): RecentSession[] {
  const latestByUnit = new Map<string, RecentSession>()
  for (const session of sessions) {
    const unitKey = session.unitCode.trim().toLocaleUpperCase()
    const existing = latestByUnit.get(unitKey)
    if (!existing || Date.parse(session.date) > Date.parse(existing.date)) {
      latestByUnit.set(unitKey, session)
    }
  }
  return [...latestByUnit.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

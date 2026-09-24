import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Overview, RecentSession, Unit } from '@/types'

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

export const useUnits = () =>
  useQuery({
    queryKey: ['lecturer', 'units'],
    queryFn: async () => (await api.get<Unit[]>('/lecturer/units')).data,
    staleTime: 5 * 60_000,
  })

export const useRecentSessions = (limit = 5) =>
  useQuery({
    queryKey: ['lecturer', 'sessions', 'recent', limit],
    queryFn: async () => (await api.get<RecentSession[]>('/lecturer/sessions/recent', { params: { limit } })).data,
    refetchInterval: 60_000,
  })

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FacultyOverview, FacultyProfile } from '@/types'

/** The faculty the signed-in officer oversees — name for the page chrome. */
export const useFacultyProfile = () =>
  useQuery({
    queryKey: ['faculty', 'me'],
    queryFn: async () => (await api.get<FacultyProfile>('/faculties/me')).data,
    staleTime: 10 * 60_000,
  })

/** Headline counts and rates across the whole faculty — the dashboard's stat tiles. */
export const useOverview = () =>
  useQuery({
    queryKey: ['faculty', 'overview'],
    queryFn: async () => (await api.get<FacultyOverview>('/faculties/overview')).data,
    refetchInterval: 60_000,
  })

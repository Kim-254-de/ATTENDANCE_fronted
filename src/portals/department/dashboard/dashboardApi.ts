import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DepartmentOverview, DepartmentProfile } from '@/types'

/** The department the signed-in officer oversees — name and faculty for the page chrome. */
export const useDepartmentProfile = () =>
  useQuery({
    queryKey: ['department', 'me'],
    queryFn: async () => (await api.get<DepartmentProfile>('/departments/me')).data,
    staleTime: 10 * 60_000,
  })

/** Headline counts and rates across the whole department — the dashboard's stat tiles. */
export const useOverview = () =>
  useQuery({
    queryKey: ['department', 'overview'],
    queryFn: async () => (await api.get<DepartmentOverview>('/departments/overview')).data,
    refetchInterval: 60_000,
  })

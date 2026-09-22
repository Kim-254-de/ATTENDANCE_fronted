import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isUnauthorized } from '@/lib/api'
import type { Lecturer } from '@/types'

export const ME_KEY = ['auth', 'me'] as const

export interface LoginInput {
  identifier: string // staff number or email
  password: string
}

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    // 401 is an expected answer ("not signed in"), so it resolves to null rather
    // than an error — otherwise stale user data would survive an expired session.
    queryFn: async (): Promise<Lecturer | null> => {
      try {
        return (await api.get<Lecturer>('/auth/me')).data
      } catch (err) {
        if (isUnauthorized(err)) return null
        throw err
      }
    },
    retry: 2,
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['login'],
    mutationFn: async (input: LoginInput) => (await api.post<Lecturer>('/auth/login', input)).data,
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => qc.clear(),
  })
}

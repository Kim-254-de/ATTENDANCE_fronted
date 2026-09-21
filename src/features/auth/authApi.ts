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
    queryFn: async () => (await api.get<Lecturer>('/auth/me')).data,
    retry: (count, err) => !isUnauthorized(err) && count < 2,
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
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

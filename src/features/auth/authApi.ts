import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isUnauthorized } from '@/lib/api'
import type { EmailVerificationResult, Lecturer, RegistrationInput, RegistrationResult } from '@/types'

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

export function useForgotPassword() {
  return useMutation({
    mutationKey: ['forgot-password'],
    mutationFn: async (email: string) => (await api.post<{ message: string }>('/auth/forgot-password', { email })).data,
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => qc.clear(),
  })
}

/** Creates the account. The backend checks the staff number against the ERP before anything is stored. */
export function useRegister() {
  return useMutation({
    mutationKey: ['register'],
    mutationFn: async (input: RegistrationInput) =>
      (await api.post<RegistrationResult>('/auth/lecturer/register', input)).data,
  })
}

/**
 * A query rather than a mutation: the token is single-use, and a query is deduplicated, so
 * StrictMode's double mount or a re-render can never send it twice and report the second
 * (already consumed) attempt as a failure.
 */
export function useVerifyEmail(token: string | null) {
  return useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: async () => (await api.post<EmailVerificationResult>('/auth/verify-email', { token })).data,
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

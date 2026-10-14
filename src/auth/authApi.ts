import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isUnauthorized } from '@/lib/api'
import type {
  Account,
  EmailVerificationResult,
  InvitationDetails,
  Lecturer,
} from '@/types'

export const ME_KEY = ['auth', 'me'] as const

export interface LoginInput {
  identifier: string // staff number (lecturer), registration number (student) or email
  password: string
}

/**
 * Full name and email are excluded on purpose: they're the exact fields the
 * ERP identity check verified at registration, and the backend rejects any
 * attempt to change them here (see updateProfileSchema in the backend).
 */
export interface UpdateProfileInput {
  title: string
  department: string
}

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    // 401 is an expected answer ("not signed in"), so it resolves to null rather
    // than an error — otherwise stale user data would survive an expired session.
    queryFn: async (): Promise<Account | null> => {
      try {
        return (await api.get<Account>('/auth/me')).data
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
    mutationFn: async (input: LoginInput) => (await api.post<Account>('/auth/login', input)).data,
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  })
}

/**
 * Partial responses (title/department only, or just avatarUrl) merge into the cached user
 * rather than replacing it. Title/department patches only ever come from a lecturer.
 */
const mergeMe = (qc: ReturnType<typeof useQueryClient>) => (patch: Partial<Lecturer> | { avatarUrl: string | null }) =>
  qc.setQueryData<Account | null>(ME_KEY, (current) => (current ? ({ ...current, ...patch } as Account) : current))

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['profile'],
    mutationFn: async (input: UpdateProfileInput) => (await api.patch<Lecturer>('/auth/me', input)).data,
    onSuccess: mergeMe(qc),
  })
}

export function useSetAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['avatar', 'set'],
    mutationFn: async (avatarDataUrl: string) =>
      (await api.post<{ avatarUrl: string | null }>('/auth/me/avatar', { avatarDataUrl })).data,
    onSuccess: mergeMe(qc),
  })
}

export function useRemoveAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['avatar', 'remove'],
    mutationFn: async () => (await api.delete<{ avatarUrl: string | null }>('/auth/me/avatar')).data,
    onSuccess: mergeMe(qc),
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

/**
 * Deletes the signed-in student's or lecturer's own account. The server signs
 * every session out and clears the cookies, so the whole cache goes too.
 */
export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['account', 'delete'],
    mutationFn: async (password: string) => {
      await api.delete('/auth/me', { data: { password } })
    },
    onSuccess: () => qc.clear(),
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

/**
 * Who an invitation link is for. A query (deduplicated, never retried) so the
 * page can greet the invitee; POST only to keep the token out of URLs the
 * server logs.
 */
export function useInvitationDetails(token: string | null) {
  return useQuery({
    queryKey: ['auth', 'invitation', token],
    queryFn: async () => (await api.post<InvitationDetails>('/auth/invitations/lookup', { token })).data,
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })
}

export interface SetPasswordInput {
  token: string
  password: string
  confirmPassword: string
}

/** Accepts an invitation: the invitee's own password, after which they sign in at /oversight. */
export function useAcceptInvitation() {
  return useMutation({
    mutationKey: ['invitation', 'accept'],
    mutationFn: async (input: SetPasswordInput) =>
      (await api.post<{ email: string; message: string }>('/auth/invitations/accept', input)).data,
  })
}

/** Completes a password reset from the emailed link. Every session is signed out. */
export function useResetPassword() {
  return useMutation({
    mutationKey: ['password', 'reset'],
    mutationFn: async (input: SetPasswordInput) => (await api.post<{ message: string }>('/auth/reset-password', input)).data,
  })
}

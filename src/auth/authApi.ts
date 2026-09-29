import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, isUnauthorized } from '@/lib/api'
import type {
  Account,
  EmailVerificationResult,
  Lecturer,
  RegistrationInput,
  RegistrationResult,
  StudentRegistrationInput,
  StudentRegistrationResult,
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
 * Creates a student account. The backend checks the registration number, name
 * and email against the student records (the timetable system) first; the
 * account becomes active once the emailed link is opened.
 */
export function useStudentRegister() {
  return useMutation({
    mutationKey: ['student-register'],
    mutationFn: async (input: StudentRegistrationInput) =>
      (await api.post<StudentRegistrationResult>('/auth/student/register', input)).data,
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

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export function useChangePassword() {
  return useMutation({
    mutationKey: ['change-password'],
    mutationFn: async (input: ChangePasswordInput) =>
      (await api.post<{ message: string }>('/auth/change-password', input)).data,
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

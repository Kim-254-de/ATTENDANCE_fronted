import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AttendanceSession, CreateSessionInput } from '@/types'

export const useCreateSession = () =>
  useMutation({
    mutationFn: async (input: CreateSessionInput) => (await api.post<AttendanceSession>('/sessions', input)).data,
  })

/** Rotates the signed QR token on an open session. */
export const useRefreshSessionQr = () =>
  useMutation({
    mutationFn: async (id: string) => (await api.post<AttendanceSession>(`/sessions/${id}/refresh`)).data,
  })

export const useCloseSession = () =>
  useMutation({
    mutationFn: async (id: string) => (await api.post<AttendanceSession>(`/sessions/${id}/close`)).data,
  })

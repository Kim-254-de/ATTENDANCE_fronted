import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DeviceLocation } from '@/types'

/**
 * Exam rooms (backend: src/modules/exam). SMARTTT sends each paper's rooms
 * with who sits where and its invigilators; the invigilator opens their own
 * room in its slot, shows its rotating code, and closes it. Students scan it
 * with the usual scanner (POST /attendance/check-in hands exam codes on).
 */

export type ExamRole = 'main' | 'extra'
export type ExamStatus = 'NOT_OPENED' | 'OPEN' | 'CLOSED'

export interface ExamSession {
  id: string
  paperKey: string
  /** "COSC 130/COSC 131" for a paper shared by several units. */
  codes: string
  title: string
  startsAt: string
  endsAt: string
  room: string
  role: ExamRole
  /** How many students are seated in this room. */
  candidates: number
  status: ExamStatus
  geofence: 'ROOM' | 'LECTURER_DEVICE' | 'OFF' | null
}

export interface ExamCode {
  session: ExamSession
  payload: string
  expiresInSeconds: number
  rotatesAt: string
}

export interface ExamReport {
  paperKey: string
  codes: string
  title: string
  /** The invigilator's room; every room of the paper for the main invigilator. */
  rooms: Array<{ room: string; role: ExamRole; sat: string[]; absent: string[] }>
}

export type OpenExamInput = { geofence: 'ON'; location?: DeviceLocation } | { geofence: 'OFF' }

/** The invigilator's exam rooms from today on, earliest first. */
export const useMyExamSessions = () =>
  useQuery({
    queryKey: ['exams', 'mine'],
    queryFn: async () => (await api.get<ExamSession[]>('/exams/sessions/mine')).data,
  })

export const useOpenExamSession = (sessionId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: OpenExamInput) => (await api.post<ExamSession>(`/exams/sessions/${sessionId}/open`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}

/** The code to show, re-asked exactly when it rotates (as for a class). */
export const useExamCode = (sessionId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['exams', sessionId, 'code'],
    queryFn: async () => (await api.get<ExamCode>(`/exams/sessions/${sessionId}/code`)).data,
    enabled: enabled && !!sessionId,
    refetchInterval: (query) => (query.state.data ? query.state.data.expiresInSeconds * 1000 : 5_000),
    refetchOnWindowFocus: false,
    retry: false,
  })

export const useCloseExamSession = (sessionId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<ExamSession>(`/exams/sessions/${sessionId}/close`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}

/** Who sat and who is absent. Polled while the room is open so names move across as students scan. */
export const useExamReport = (sessionId: string | undefined, live: boolean) =>
  useQuery({
    queryKey: ['exams', sessionId, 'report'],
    queryFn: async () => (await api.get<ExamReport>(`/exams/sessions/${sessionId}/report`)).data,
    enabled: !!sessionId,
    refetchInterval: live ? 5_000 : false,
    refetchOnWindowFocus: false,
  })

/** An invigilator may open the room from this long before the paper (backend OPEN_EARLY_MINUTES). */
export const OPEN_EARLY_MINUTES = 30

export const canOpenNow = (s: ExamSession, now = Date.now()) =>
  s.status === 'NOT_OPENED' &&
  now >= new Date(s.startsAt).getTime() - OPEN_EARLY_MINUTES * 60_000 &&
  now <= new Date(s.endsAt).getTime()

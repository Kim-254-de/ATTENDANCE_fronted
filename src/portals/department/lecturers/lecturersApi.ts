import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DepartmentLecturer, DepartmentLecturerDetail, DepartmentTimekeepingEntry } from '@/types'

/** Every lecturer in the department, with their teaching load and attendance/punctuality standing. */
export const useDepartmentLecturers = () =>
  useQuery({
    queryKey: ['department', 'lecturers'],
    queryFn: async () => (await api.get<DepartmentLecturer[]>('/departments/lecturers')).data,
    staleTime: 60_000,
  })

/** GET /departments/lecturers/:id, as the backend actually shapes it: identity nested, sessions under `sessions`. */
interface RawDepartmentLecturerDetail {
  lecturer: { userId: string; fullName: string; staffNumber: string; title: string | null; email: string }
  units: { unitId: string; unitCode: string; unitName: string | null; lecturerUserId: string; lecturerName: string; activeStudents: number; sessionsHeld: number; avgAttendanceRate: number | null }[]
  sessions: { sessionId: string; unitId: string; unitCode: string; title: string | null; status: string; opensAt: string; closesAt: string; scheduledStartAt: string | null; lateMinutes: number | null; present: number; total: number; attendanceRate: number | null }[]
}

/** One lecturer's drill-down: per-unit attendance plus their recent sessions' timekeeping. */
export const useDepartmentLecturer = (lecturerUserId: string | undefined) =>
  useQuery({
    queryKey: ['department', 'lecturers', lecturerUserId],
    queryFn: async () => {
      const raw = (await api.get<RawDepartmentLecturerDetail>(`/departments/lecturers/${lecturerUserId}`)).data
      const detail: DepartmentLecturerDetail = {
        userId: raw.lecturer.userId,
        fullName: raw.lecturer.fullName,
        staffNumber: raw.lecturer.staffNumber,
        units: raw.units.map((u) => ({ unitId: u.unitId, code: u.unitCode, name: u.unitName, attendanceRate: u.avgAttendanceRate })),
        recentSessions: raw.sessions.map((s) => ({ sessionId: s.sessionId, unitCode: s.unitCode, scheduledStartAt: s.scheduledStartAt, opensAt: s.opensAt, lateMinutes: s.lateMinutes })),
      }
      return detail
    },
    enabled: !!lecturerUserId,
    staleTime: 60_000,
  })

export interface TimekeepingFilters {
  lecturerUserId?: string
  unitId?: string
  limit?: number
}

/** Recent sessions across the department, newest first — scheduled start against when it actually opened. */
export const useTimekeeping = (filters: TimekeepingFilters = {}) =>
  useQuery({
    queryKey: ['department', 'timekeeping', filters],
    queryFn: async () =>
      (await api.get<DepartmentTimekeepingEntry[]>('/departments/timekeeping', { params: filters })).data,
    staleTime: 60_000,
  })

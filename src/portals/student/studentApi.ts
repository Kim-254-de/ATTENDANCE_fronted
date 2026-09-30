import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StudentAttendance, StudentUnit } from '@/types'

export const MY_STUDENT_UNITS_KEY = ['students', 'me', 'units'] as const
export const MY_ATTENDANCE_KEY = ['students', 'me', 'attendance'] as const

/** The units the signed-in student is on (their group, for a split unit), with their attendance rate in each. */
export const useMyStudentUnits = () =>
  useQuery({
    queryKey: MY_STUDENT_UNITS_KEY,
    queryFn: async () => (await api.get<StudentUnit[]>('/students/me/units')).data,
    staleTime: 60_000,
  })

/** The student's class sessions, newest first: PRESENT, ABSENT, or OPEN (still taking check-ins). Optionally one unit. */
export const useMyAttendance = ({ unitId, limit = 50 }: { unitId?: string; limit?: number } = {}) =>
  useQuery({
    queryKey: [...MY_ATTENDANCE_KEY, unitId ?? null, limit],
    queryFn: async () => (await api.get<StudentAttendance>('/students/me/attendance', { params: { unitId, limit } })).data,
  })

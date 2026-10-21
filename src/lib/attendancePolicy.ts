import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AttendancePolicy } from '@/types'

/**
 * The minimum share of a unit's classes a student must attend to sit its exam. The real value is
 * an institution-wide setting QA keeps in line with the Senate's rule (GET /attendance-policy);
 * this is only what is shown until it loads, or if it cannot be read, and matches the backend's
 * own default.
 */
export const MIN_REQUIRED_ATTENDANCE = 75

export const ATTENDANCE_POLICY_KEY = ['attendance-policy'] as const

/** The exam-eligibility rule, for every signed-in role. Rarely changes, so it is cached generously. */
export const useAttendancePolicy = () =>
  useQuery({
    queryKey: ATTENDANCE_POLICY_KEY,
    queryFn: async () => (await api.get<AttendancePolicy>('/attendance-policy')).data,
    staleTime: 10 * 60_000,
  })

/**
 * The minimum attendance percentage to judge a rate against, shared by the student portal (their
 * own standing) and every staff portal (their students' standing), so they never drift apart.
 */
export function useMinAttendance(): number {
  const { data } = useAttendancePolicy()
  return data?.minAttendancePercent ?? MIN_REQUIRED_ATTENDANCE
}

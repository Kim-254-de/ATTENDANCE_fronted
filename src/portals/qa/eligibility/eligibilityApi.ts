import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ATTENDANCE_POLICY_KEY } from '@/lib/attendancePolicy'
import type { AttendancePolicy, EligibilityReport } from '@/types'

export interface QaEligibilityFilters {
  all: boolean
  departmentId?: string
  facultyId?: string
}

/** Exam eligibility institution-wide, or narrowed to a department or faculty. */
export const useQaEligibility = (filters: QaEligibilityFilters) =>
  useQuery({
    queryKey: ['qa', 'eligibility', filters],
    queryFn: async () =>
      (await api.get<EligibilityReport>('/quality-assurance/eligibility', {
        params: {
          ...(filters.all ? { all: 'true' } : {}),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.facultyId ? { facultyId: filters.facultyId } : {}),
        },
      })).data,
    staleTime: 60_000,
  })

/** Changes the minimum attendance to sit exams. Audited on the server; every portal follows it. */
export const useUpdatePolicy = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { minAttendancePercent?: number; atRiskMarginPercent?: number }) =>
      (await api.put<AttendancePolicy>('/quality-assurance/attendance-policy', input)).data,
    onSuccess: (policy) => {
      qc.setQueryData(ATTENDANCE_POLICY_KEY, policy)
      qc.invalidateQueries({ queryKey: ['qa', 'eligibility'] })
    },
  })
}

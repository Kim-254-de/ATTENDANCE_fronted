import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DepartmentUnit } from '@/types'

/** GET /departments/units, as the backend actually names its fields. */
interface RawDepartmentUnit {
  unitId: string
  unitCode: string
  unitName: string | null
  lecturerUserId: string
  lecturerName: string
  activeStudents: number
  sessionsHeld: number
  avgAttendanceRate: number | null
}

/** Every unit taught in the department, with who teaches it and how it is attended. */
export const useDepartmentUnits = () =>
  useQuery({
    queryKey: ['department', 'units'],
    queryFn: async () => {
      const raw = (await api.get<RawDepartmentUnit[]>('/departments/units')).data
      return raw.map(
        (u): DepartmentUnit => ({
          id: u.unitId,
          code: u.unitCode,
          name: u.unitName,
          lecturerName: u.lecturerName,
          studentCount: u.activeStudents,
          attendanceRate: u.avgAttendanceRate,
        }),
      )
    },
    staleTime: 5 * 60_000,
  })

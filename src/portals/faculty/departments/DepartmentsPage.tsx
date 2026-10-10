import { Building2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { RateBar } from '@/components/attendance/RateBar'
import { errorMessage } from '@/lib/api'
import type { FacultyDepartment } from '@/types'
import { useFacultyDepartments } from './departmentsApi'

const HEADERS = ['DEPARTMENT', 'LECTURERS', 'STUDENTS', 'UNITS', 'AVG. ATTENDANCE', 'SESSIONS', 'ON TIME']

/**
 * One row per department in the faculty — the view a department officer
 * cannot get on their own: every department's load and attendance standing,
 * worst-attended first, so the one needing attention leads.
 */
export function DepartmentsPage() {
  const { data: departments, isPending, error, refetch } = useFacultyDepartments()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (departments ?? [])
      .filter((d) => !query || d.departmentName.toLowerCase().includes(query))
      .sort((a, b) => (a.avgAttendanceRate ?? 101) - (b.avgAttendanceRate ?? 101))
  }, [departments, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Every department in your faculty, listed by attendance standing. Open a row for its lecturers and units.</p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search department…"
            aria-label="Search department"
            className="input pl-10"
          />
        </label>
        <span className="text-sm text-muted">{departments ? `${rows.length} department${rows.length === 1 ? '' : 's'}` : ''}</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the faculty’s departments.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !departments ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : departments.length === 0 ? (
        <Card className="p-10 text-center">
          <Building2 className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No departments yet</p>
          <p className="mt-1 text-sm text-muted">Departments appear here once they exist in this faculty.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No departments match your search.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                {HEADERS.map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => <DepartmentRow key={d.departmentId} department={d} />)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function DepartmentRow({ department }: { department: FacultyDepartment }) {
  return (
    <tr className="transition-colors hover:bg-teal-50/60">
      <td className="px-5 py-3">
        <Link to={`/faculty-departments/${department.departmentId}`} className="flex items-center gap-2.5 hover:underline">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-700 text-white"><Building2 className="size-4" aria-hidden /></span>
          <span className="font-medium text-navy-900">{department.departmentName}</span>
        </Link>
      </td>
      <td className="px-5 py-3 text-navy-900">{department.lecturerCount}</td>
      <td className="px-5 py-3 text-navy-900">{department.studentCount}</td>
      <td className="px-5 py-3 text-navy-900">{department.unitCount}</td>
      <td className="px-5 py-3"><RateBar rate={department.avgAttendanceRate} label={`${department.departmentName} average attendance`} /></td>
      <td className="px-5 py-3 text-navy-900">{department.sessionsHeld}</td>
      <td className="px-5 py-3"><RateBar rate={department.onTimeRate} label={`${department.departmentName} on-time rate`} /></td>
    </tr>
  )
}

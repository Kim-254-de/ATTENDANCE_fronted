import { ArrowLeft, Building2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AvgLateMinutes, RateBar } from '@/components/attendance/RateBar'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { useFacultyDepartment } from './departmentsApi'

/**
 * One department, from the faculty's side: its lecturers (load, attendance,
 * punctuality) and its units (who teaches what, how well attended) — the same
 * two tables a department officer sees, scoped the same way, for the one
 * department a faculty officer has opened.
 */
export function DepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const { data, isPending, error, refetch } = useFacultyDepartment(departmentId)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/faculty-departments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All departments
      </Link>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load this department.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !data ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : (
        <>
          <Card className="flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-700 text-white"><Building2 className="size-5" aria-hidden /></span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-navy-900">{data.departmentName}</h2>
              <p className="text-xs text-muted">{data.lecturers.length} lecturer{data.lecturers.length === 1 ? '' : 's'} · {data.units.length} unit{data.units.length === 1 ? '' : 's'}</p>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <h2 className="p-5 font-semibold text-navy-900">Lecturers</h2>
            {data.lecturers.length === 0 ? (
              <p className="border-t border-line p-8 text-center text-sm text-muted">No lecturers assigned to this department yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      {['LECTURER', 'UNITS', 'STUDENTS', 'AVG. ATTENDANCE', 'ON TIME'].map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.lecturers.map((l) => (
                      <tr key={l.userId}>
                        <td className="px-5 py-3">
                          <Link to={`/faculty-lecturers/${l.userId}`} className="flex items-center gap-2.5 hover:underline">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white">{initials(l.fullName)}</span>
                            <span className="font-medium text-navy-900">{l.fullName}</span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-navy-900">{l.unitsTaught}</td>
                        <td className="px-5 py-3 text-navy-900">{l.studentsTaught}</td>
                        <td className="px-5 py-3"><RateBar rate={l.avgAttendanceRate} label={`${l.fullName} average attendance`} /></td>
                        <td className="px-5 py-3">
                          <RateBar rate={l.onTimeRate} label={`${l.fullName} on-time rate`} />
                          <AvgLateMinutes minutes={l.avgLateMinutes} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <h2 className="p-5 font-semibold text-navy-900">Units</h2>
            {data.units.length === 0 ? (
              <p className="border-t border-line p-8 text-center text-sm text-muted">No units taught in this department yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      {['UNIT', 'NAME', 'LECTURER', 'STUDENTS', 'AVG. ATTENDANCE'].map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.units.map((u) => (
                      <tr key={u.unitId}>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-100">{u.unitCode}</span>
                        </td>
                        <td className="px-5 py-3 text-navy-900">{u.unitName ?? '—'}</td>
                        <td className="px-5 py-3 text-navy-900">{u.lecturerName}</td>
                        <td className="px-5 py-3 text-navy-900">{u.activeStudents}</td>
                        <td className="px-5 py-3"><RateBar rate={u.avgAttendanceRate} label={`${u.unitCode} average attendance`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

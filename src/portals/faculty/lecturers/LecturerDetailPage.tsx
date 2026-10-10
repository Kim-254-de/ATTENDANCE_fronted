import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { LateMinutes, RateBar } from '@/components/attendance/RateBar'
import { errorMessage } from '@/lib/api'
import { formatDateTime, initials } from '@/lib/format'
import type { FacultyLecturerSession } from '@/types'
import { useFacultyLecturer } from './lecturersApi'

/**
 * One lecturer, from the faculty's side: which department they belong to, is
 * each of their units attended, and do their classes start when the
 * timetable says they should.
 */
export function LecturerDetailPage() {
  const { lecturerUserId } = useParams<{ lecturerUserId: string }>()
  const { data, isPending, error, refetch } = useFacultyLecturer(lecturerUserId)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/faculty-lecturers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All lecturers
      </Link>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load this lecturer.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !data ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : (
        <>
          <Card className="flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{initials(data.lecturer.fullName)}</span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-navy-900">{data.lecturer.fullName}</h2>
              <p className="font-mono text-xs text-muted">{data.lecturer.staffNumber}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-100">{data.lecturer.departmentName}</span>
          </Card>

          <Card className="overflow-hidden">
            <h2 className="p-5 font-semibold text-navy-900">Units taught</h2>
            {data.units.length === 0 ? (
              <p className="border-t border-line p-8 text-center text-sm text-muted">No units assigned to this lecturer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      {['UNIT', 'NAME', 'AVG. ATTENDANCE'].map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.units.map((unit) => (
                      <tr key={unit.unitId}>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-100">{unit.unitCode}</span>
                        </td>
                        <td className="px-5 py-3 text-navy-900">{unit.unitName ?? '—'}</td>
                        <td className="px-5 py-3"><RateBar rate={unit.avgAttendanceRate} label={`${unit.unitCode} average attendance`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5">
              <h2 className="font-semibold text-navy-900">Timekeeping</h2>
              <p className="mt-1 text-sm text-muted">Recent classes, newest first: when each was timetabled to start against when it was actually opened.</p>
            </div>
            {data.sessions.length === 0 ? (
              <p className="border-t border-line p-8 text-center text-sm text-muted">No classes held yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      {['UNIT', 'SCHEDULED START', 'ACTUAL START', 'PUNCTUALITY'].map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.sessions.map((s) => <TimekeepingRow key={s.sessionId} session={s} />)}
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

function TimekeepingRow({ session }: { session: FacultyLecturerSession }) {
  return (
    <tr>
      <td className="px-5 py-3">
        <span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{session.unitCode}</span>
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-muted">{session.scheduledStartAt ? formatDateTime(session.scheduledStartAt) : '—'}</td>
      <td className="whitespace-nowrap px-5 py-3 text-navy-900">{formatDateTime(session.opensAt)}</td>
      <td className="px-5 py-3"><LateMinutes minutes={session.lateMinutes} /></td>
    </tr>
  )
}

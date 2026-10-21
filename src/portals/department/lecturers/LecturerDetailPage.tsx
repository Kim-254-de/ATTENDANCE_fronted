import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteAccountButton } from '@/components/DeleteAccountButton'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime, initials } from '@/lib/format'
import type { LecturerTimekeepingEntry } from '@/types'
import { LateMinutes, RateBar } from '@/components/attendance/RateBar'
import { useDepartmentLecturer } from './lecturersApi'

/**
 * One lecturer, two questions: is each of their units attended, and do their
 * classes start when the timetable says they should. The timekeeping table is
 * the only place either portal shows scheduled start against actual start.
 */
export function LecturerDetailPage() {
  const { lecturerUserId } = useParams<{ lecturerUserId: string }>()
  const { data, isPending, error, refetch } = useDepartmentLecturer(lecturerUserId)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/department-lecturers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All lecturers
      </Link>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load this lecturer.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !data ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : (
        <>
          <Card className="flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{initials(data.fullName)}</span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-ink">{data.fullName}</h2>
              <p className="font-mono text-xs text-muted">{data.staffNumber}</p>
            </div>
            {lecturerUserId && (
              <div className="ml-auto shrink-0">
                <DeleteAccountButton scope="department" kind="lecturer" userId={lecturerUserId} name={data.fullName} onDeleted={() => navigate('/department-lecturers', { replace: true })} />
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <h2 className="p-5 font-semibold text-ink">Units taught</h2>
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
                          <span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{unit.code}</span>
                        </td>
                        <td className="px-5 py-3 text-ink">{unit.name ?? '—'}</td>
                        <td className="px-5 py-3"><RateBar rate={unit.attendanceRate} label={`${unit.code} average attendance`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5">
              <h2 className="font-semibold text-ink">Timekeeping</h2>
              <p className="mt-1 text-sm text-muted">Recent classes, newest first: when each was timetabled to start against when it was actually opened.</p>
            </div>
            {data.recentSessions.length === 0 ? (
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
                    {data.recentSessions.map((s) => <TimekeepingRow key={s.sessionId} session={s} />)}
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

function TimekeepingRow({ session }: { session: LecturerTimekeepingEntry }) {
  return (
    <tr>
      <td className="px-5 py-3">
        <span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-ink">{session.unitCode}</span>
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-muted">{session.scheduledStartAt ? formatDateTime(session.scheduledStartAt) : '—'}</td>
      <td className="whitespace-nowrap px-5 py-3 text-ink">{formatDateTime(session.opensAt)}</td>
      <td className="px-5 py-3"><LateMinutes minutes={session.lateMinutes} /></td>
    </tr>
  )
}

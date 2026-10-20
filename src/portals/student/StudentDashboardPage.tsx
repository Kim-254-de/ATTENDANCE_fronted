import { ChevronRight, MessageSquareQuote, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMe } from '@/auth/authApi'
import { errorMessage } from '@/lib/api'
import { RecordRow } from './AttendanceRecordRow'
import { attendanceStreak, todaysRecords } from './attendanceStats'
import { usePendingEvaluationCount } from './evaluationsApi'
import { useMyAttendance } from './studentApi'

// Wide enough to reliably cover "today" and a short back-streak on a typical timetable, without
// pulling the full history the dedicated Progress page fetches.
const HOME_ATTENDANCE_LIMIT = 20

const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate)}%`)

/**
 * The student's home: today's stats at a glance, QR check-in, and today's classes.
 */
export function StudentDashboardPage() {
  const { data: me } = useMe()
  const attendance = useMyAttendance({ limit: HOME_ATTENDANCE_LIMIT })
  const pendingEvaluations = usePendingEvaluationCount()
  const user = me?.role === 'student' ? me : undefined
  if (!user) return null

  const summary = attendance.data?.summary
  const records = attendance.data?.records ?? []
  const today = todaysRecords(records)
  const attendedToday = today.filter((r) => r.mark === 'PRESENT').length
  const streak = attendance.data ? attendanceStreak(records) : 0

  return (
    <div className="space-y-6">
      <Card className="grid grid-cols-3 divide-x divide-line p-5 text-center">
        <Stat value={`${attendedToday}/${today.length}`} label="classes" />
        <Stat value={summary ? formatRate(summary.attendanceRate) : '…'} label="overall" />
        <Stat value={`${streak} 🔥`} label="days" />
      </Card>

      {pendingEvaluations > 0 && (
        <Link to="/student-evaluations" className="block">
          <Card className="flex items-center gap-3 p-4 transition hover:shadow-md">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><MessageSquareQuote className="size-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy-900">Course evaluation open</p>
              <p className="text-xs text-muted">{pendingEvaluations} unit{pendingEvaluations === 1 ? '' : 's'} to rate. Anonymous, takes a minute each.</p>
            </div>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Card>
        </Link>
      )}

      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><ScanLine className="size-5" aria-hidden /></span>
          <div><h2 className="font-bold text-navy-900">Scan QR Code</h2><p className="text-xs text-muted">Point camera at the board</p></div>
        </div>
        <div className="relative grid h-44 place-items-center rounded-2xl border-2 border-dashed border-line">
          <CornerBrackets />
          <div className="text-center text-muted">
            <ScanLine className="mx-auto size-8" aria-hidden />
            <p className="mt-2 text-sm">Ready to scan</p>
          </div>
        </div>
        <Link
          to="/scan"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-linear-to-b from-blue-600 to-blue-700 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          Start QR Scan
        </Link>
      </Card>

      <section aria-labelledby="todays-classes" className="space-y-3">
        <div>
          <h2 id="todays-classes" className="text-lg font-bold text-navy-900">Today's Classes</h2>
        </div>
        {attendance.error ? (
          <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(attendance.error, 'Could not load your attendance.')}</Card>
        ) : attendance.isPending ? (
          <Skeleton className="h-[120px]" />
        ) : today.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No classes for your units are scheduled today.</Card>
        ) : (
          <Card className="divide-y divide-line">{today.map((r) => <RecordRow key={r.sessionId} record={r} />)}</Card>
        )}
      </section>
    </div>
  )
}

function CornerBrackets() {
  const corner = 'absolute size-6 border-blue-700'
  return (
    <>
      <span className={`${corner} left-3 top-3 border-l-2 border-t-2`} aria-hidden />
      <span className={`${corner} right-3 top-3 border-r-2 border-t-2`} aria-hidden />
      <span className={`${corner} bottom-3 left-3 border-b-2 border-l-2`} aria-hidden />
      <span className={`${corner} bottom-3 right-3 border-b-2 border-r-2`} aria-hidden />
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-navy-900">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

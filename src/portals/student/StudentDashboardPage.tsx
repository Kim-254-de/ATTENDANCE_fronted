import { ScanFace, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMe } from '@/auth/authApi'
import { errorMessage } from '@/lib/api'
import { RecordRow } from './AttendanceRecordRow'
import { attendanceStreak, todaysRecords } from './attendanceStats'
import { useMyAttendance } from './studentApi'

// Wide enough to reliably cover "today" and a short back-streak on a typical timetable, without
// pulling the full history the dedicated Progress page fetches.
const HOME_ATTENDANCE_LIMIT = 20

const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate)}%`)

/**
 * The student's home: today's stats at a glance, the two check-in methods, and today's classes.
 * Face ID is a planned, not-yet-built check-in method (only QR exists today), so its card is
 * disabled with the same "coming soon" convention as the lecturer portal's placeholder pages
 * (see src/pages/ComingSoon.tsx) rather than a working button.
 */
export function StudentDashboardPage() {
  const { data: me } = useMe()
  const attendance = useMyAttendance({ limit: HOME_ATTENDANCE_LIMIT })
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
          className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          Start QR Scan
        </Link>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gold-100 text-gold-600"><ScanFace className="size-5" aria-hidden /></span>
            <div><h2 className="font-bold text-navy-900">Face Recognition</h2><p className="text-xs text-muted">Biometric attendance</p></div>
          </div>
          <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted">Coming soon</span>
        </div>
        <div className="grid h-44 place-items-center rounded-2xl border border-line">
          <div className="text-center text-muted">
            <span className="mx-auto grid size-16 place-items-center rounded-full border-2 border-line"><ScanFace className="size-7" aria-hidden /></span>
            <p className="mt-2 text-sm">Center your face in frame</p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="h-12 w-full cursor-not-allowed rounded-xl bg-line text-sm font-semibold text-muted"
        >
          Start Face ID
        </button>
        <p className="text-center text-xs text-muted">This feature is planned for the next milestone.</p>
      </Card>

      <section aria-labelledby="todays-classes" className="space-y-3">
        <div className="flex items-center justify-between">
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

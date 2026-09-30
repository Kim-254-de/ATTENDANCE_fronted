import { CalendarCheck, CheckCircle2, Clock3, GraduationCap, ScanLine, UserRound, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMe } from '@/auth/authApi'
import { useMyAttendance, useMyStudentUnits } from './studentApi'
import { errorMessage } from '@/lib/api'
import { getGreeting, initials } from '@/lib/format'
import type { AttendanceMark, StudentAttendanceRecord, StudentUnit } from '@/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** First name for the greeting. Unlike lib/format's firstName (which drops a lecturer's title), only strips an honorific if there is one. */
const givenName = (fullName: string) => fullName.replace(/^(dr|prof|mr|mrs|ms|miss)\.?\s+/i, '').split(' ')[0] ?? fullName
const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate)}%`)
const rateTone = (rate: number | null) =>
  rate === null ? 'text-muted' : rate >= 75 ? 'text-success' : rate >= 50 ? 'text-gold-600' : 'text-red-600'
const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** The student's home: scan to check in, their units and their attendance so far. */
export function StudentDashboardPage() {
  const { data: me } = useMe()
  const units = useMyStudentUnits()
  const attendance = useMyAttendance(10)
  const user = me?.role === 'student' ? me : undefined
  if (!user) return null

  const summary = attendance.data?.summary

  return (
    <main className="min-h-dvh bg-surface p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3 rounded-2xl bg-navy-900 px-5 py-4 text-white shadow-lg sm:px-7">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500"><GraduationCap className="size-6" aria-hidden /></span>
          <div><p className="font-bold">Smart Attendance</p><p className="text-sm text-blue-200">Student Portal</p></div>
          <Link to="/student-profile" className="ml-auto flex items-center gap-2 text-sm font-semibold text-white hover:text-gold-300"><span className="grid size-9 place-items-center rounded-full bg-white/15">{initials(user.fullName)}</span><span className="hidden sm:inline">My profile</span></Link>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-8">
          <p className="text-sm font-semibold text-gold-600">STUDENT WORKSPACE</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{getGreeting()}, {givenName(user.fullName)}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">In class, scan the QR code your lecturer shows to be marked present.</p>
          <Link
            to="/scan"
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-500 to-gold-600 px-6 text-sm font-semibold text-white shadow-sm hover:brightness-105 sm:w-auto"
          >
            <ScanLine className="size-5" aria-hidden /> Scan attendance QR code
          </Link>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<CalendarCheck className="size-5" />} label="Attendance rate" value={summary ? formatRate(summary.attendanceRate) : '…'} detail="Recent classes" />
          <Stat icon={<Clock3 className="size-5" />} label="Classes attended" value={summary ? `${summary.attended} / ${summary.sessionsHeld}` : '…'} detail="Recent classes" />
          <Stat icon={<GraduationCap className="size-5" />} label="Programme" value={user.programme ?? '—'} detail={user.registrationNumber} />
        </div>

        <section aria-labelledby="my-units" className="space-y-3">
          <h2 id="my-units" className="text-lg font-bold text-navy-900">My units</h2>
          {units.error ? (
            <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(units.error, 'Could not load your units.')}</Card>
          ) : units.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[120px]" />)}</div>
          ) : units.data.length === 0 ? (
            <Card className="p-6 text-sm text-muted">
              You aren't on any unit's class list yet. Units appear here once you're registered for them on the timetable app
              (and, for a unit split into groups, have picked your group).
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">{units.data.map((u) => <UnitCard key={u.id} unit={u} />)}</ul>
          )}
        </section>

        <section aria-labelledby="recent" className="space-y-3">
          <h2 id="recent" className="text-lg font-bold text-navy-900">Recent classes</h2>
          {attendance.error ? (
            <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(attendance.error, 'Could not load your attendance.')}</Card>
          ) : attendance.isPending ? (
            <Skeleton className="h-[160px]" />
          ) : attendance.data.records.length === 0 ? (
            <Card className="p-6 text-sm text-muted">No classes have been held for your units yet.</Card>
          ) : (
            <Card className="divide-y divide-line">{attendance.data.records.map((r) => <RecordRow key={r.sessionId} record={r} />)}</Card>
          )}
        </section>
      </div>
    </main>
  )
}

function UnitCard({ unit }: { unit: StudentUnit }) {
  return (
    <li>
      <Card className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{unit.code}</span>
          <span className={`text-lg font-bold ${rateTone(unit.attendanceRate)}`}>{formatRate(unit.attendanceRate)}</span>
        </div>
        <div>
          <h3 className="truncate font-semibold text-navy-900">{unit.name ?? unit.code}</h3>
          {unit.schedule && <p className="text-xs text-muted">{DAYS[unit.schedule.dayOfWeek]} {unit.schedule.startTime}–{unit.schedule.endTime}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span className="flex items-center gap-1"><UserRound className="size-3.5" aria-hidden />{unit.lecturerName}</span>
          <span className="text-xs">{unit.sessionsAttended} of {unit.sessionsHeld} classes</span>
        </div>
      </Card>
    </li>
  )
}

const MARKS: Record<AttendanceMark, { label: string; icon: React.ReactNode; tone: string }> = {
  PRESENT: { label: 'Present', icon: <CheckCircle2 className="size-4" aria-hidden />, tone: 'bg-emerald-50 text-success' },
  ABSENT: { label: 'Absent', icon: <XCircle className="size-4" aria-hidden />, tone: 'bg-red-50 text-red-700' },
  OPEN: { label: 'Open now', icon: <ScanLine className="size-4" aria-hidden />, tone: 'bg-gold-100 text-gold-600' },
}

function RecordRow({ record }: { record: StudentAttendanceRecord }) {
  const mark = MARKS[record.mark]
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy-900">{record.unitCode}{record.title ? ` · ${record.title}` : ''}</p>
        <p className="text-xs text-muted">{formatWhen(record.opensAt)}</p>
      </div>
      {record.mark === 'OPEN' ? (
        <Link to="/scan" className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${mark.tone}`}>{mark.icon}Scan now</Link>
      ) : (
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${mark.tone}`}>{mark.icon}{mark.label}</span>
      )}
    </div>
  )
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="p-5"><span className="grid size-10 place-items-center rounded-xl bg-gold-100 text-gold-600">{icon}</span><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className="mt-1 truncate text-xl font-bold text-navy-900">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></Card>
}

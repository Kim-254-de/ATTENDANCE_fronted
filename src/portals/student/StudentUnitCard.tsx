import { UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import type { StudentUnit } from '@/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Shared with the Progress page's per-unit breakdown. */
export const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate)}%`)
export const rateTone = (rate: number | null) =>
  rate === null ? 'text-muted' : rate >= 75 ? 'text-success' : rate >= 50 ? 'text-gold-600' : 'text-red-600'

/** Shared between the dashboard's preview grid and the full My Units page. */
export function UnitCard({ unit }: { unit: StudentUnit }) {
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
          <span className="flex items-center gap-1"><UserRound className="size-3.5" aria-hidden />{unit.lecturerName ?? 'Lecturer to be confirmed'}</span>
          {unit.onRoster && <span className="text-xs">{unit.sessionsAttended} of {unit.sessionsHeld} classes</span>}
        </div>
        {unit.id ? (
          <Link to={`/student-attendance?unitId=${unit.id}`} className="block text-sm font-semibold text-navy-900 hover:underline">View attendance →</Link>
        ) : unit.groupRequired ? (
          <p className="text-sm text-gold-600">Pick your group for this unit on the timetable app to be added to a class list.</p>
        ) : (
          <p className="text-sm text-muted">Attendance starts once your lecturer sets this unit up here.</p>
        )}
      </Card>
    </li>
  )
}

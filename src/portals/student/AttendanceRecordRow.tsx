import { ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StudentAttendanceRecord } from '@/types'
import { displayMark, type DisplayMark } from './attendanceStats'

export const MARKS: Record<DisplayMark, { label: string; tone: string; square: string }> = {
  PRESENT: { label: 'Present', tone: 'text-success', square: 'bg-emerald-50 text-success' },
  LATE: { label: 'Late', tone: 'text-orange-600', square: 'bg-orange-50 text-orange-600' },
  ABSENT: { label: 'Absent', tone: 'text-red-700', square: 'bg-red-50 text-red-700' },
  OPEN: { label: 'Open now', tone: 'text-blue-700', square: 'bg-blue-50 text-blue-700' },
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/**
 * Shared between the dashboard's "Today's Classes" preview and the full Attendance History page.
 * Every row's icon is the QR scan glyph — check-in only ever happens by QR today, so a row never
 * implies a method (e.g. face recognition) that didn't actually record it.
 */
export function RecordRow({ record }: { record: StudentAttendanceRecord }) {
  const mark = MARKS[displayMark(record)]
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${mark.square}`}><ScanLine className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy-900">{record.unitName ?? record.unitCode}</p>
        <p className="truncate text-xs text-muted">{record.unitCode}{record.title ? ` · ${record.title}` : ''} · {formatTime(record.opensAt)}</p>
      </div>
      {record.mark === 'OPEN' ? (
        <Link to="/scan" className={`shrink-0 text-xs font-semibold ${mark.tone} hover:underline`}>Scan now</Link>
      ) : (
        <span className={`shrink-0 text-xs font-semibold ${mark.tone}`}>{mark.label}</span>
      )}
    </div>
  )
}

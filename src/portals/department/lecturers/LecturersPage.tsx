import { GraduationCap, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import type { DepartmentLecturer } from '@/types'
import { AvgLateMinutes, RateBar } from '../RateBar'
import { useDepartmentLecturers } from './lecturersApi'

const HEADERS = ['LECTURER', 'STAFF NO.', 'UNITS', 'STUDENTS', 'AVG. ATTENDANCE', 'SESSIONS', 'ON TIME']

/** Every lecturer in the department, worst-attended first — the rows that need a conversation. */
export function LecturersPage() {
  const { data: lecturers, isPending, error, refetch } = useDepartmentLecturers()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (lecturers ?? [])
      .filter((l) => !query || l.fullName.toLowerCase().includes(query) || l.staffNumber.toLowerCase().includes(query))
      // Null rates (nothing held yet) sort last: there is nothing to act on there.
      .sort((a, b) => (a.avgAttendanceRate ?? 101) - (b.avgAttendanceRate ?? 101))
  }, [lecturers, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Everyone teaching in your department, listed by attendance standing. Open a row for their units and timekeeping.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or staff number…"
            aria-label="Search name or staff number"
            className="input pl-10"
          />
        </label>
        <span className="text-sm text-muted">{lecturers ? `${rows.length} lecturer${rows.length === 1 ? '' : 's'}` : ''}</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the department’s lecturers.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !lecturers ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : lecturers.length === 0 ? (
        <Card className="p-10 text-center">
          <GraduationCap className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No lecturers yet</p>
          <p className="mt-1 text-sm text-muted">Lecturers appear here once they are assigned a unit in this department.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No lecturers match your search.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                {HEADERS.map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((l) => <LecturerRow key={l.userId} lecturer={l} />)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function LecturerRow({ lecturer }: { lecturer: DepartmentLecturer }) {
  return (
    <tr className="transition-colors hover:bg-indigo-50/60">
      <td className="px-5 py-3">
        <Link to={`/department-lecturers/${lecturer.userId}`} className="flex items-center gap-2.5 hover:underline">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-700 text-xs font-bold text-white">{initials(lecturer.fullName)}</span>
          <span className="font-medium text-navy-900">{lecturer.fullName}</span>
        </Link>
      </td>
      <td className="px-5 py-3 font-mono text-xs text-muted">{lecturer.staffNumber}</td>
      <td className="px-5 py-3 text-navy-900">{lecturer.unitsTaught}</td>
      <td className="px-5 py-3 text-navy-900">{lecturer.studentsTaught}</td>
      <td className="px-5 py-3"><RateBar rate={lecturer.avgAttendanceRate} label={`${lecturer.fullName} average attendance`} /></td>
      <td className="px-5 py-3 text-navy-900">{lecturer.sessionsHeld}</td>
      <td className="px-5 py-3">
        <RateBar rate={lecturer.onTimeRate} label={`${lecturer.fullName} on-time rate`} />
        <AvgLateMinutes minutes={lecturer.avgLateMinutes} />
      </td>
    </tr>
  )
}

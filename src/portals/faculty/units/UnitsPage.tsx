import { BookOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { RateBar } from '@/components/attendance/RateBar'
import { errorMessage } from '@/lib/api'
import type { FacultyUnit } from '@/types'
import { useFacultyUnits } from './unitsApi'

const HEADERS = ['UNIT', 'NAME', 'DEPARTMENT', 'LECTURER', 'STUDENTS', 'AVG. ATTENDANCE']

/**
 * Every unit taught across the faculty, worst-attended first. Read-only — a
 * faculty officer reassigns nothing here. One row per section: a unit split
 * into groups (e.g. "CSC102 GR A"..."GR G") lists each group separately, the
 * same way the backend's per-lecturer figures do.
 */
export function UnitsPage() {
  const { data: units, isPending, error, refetch } = useFacultyUnits()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (units ?? [])
      .filter((u) => !query
        || u.unitCode.toLowerCase().includes(query)
        || (u.unitName ?? '').toLowerCase().includes(query)
        || u.lecturerName.toLowerCase().includes(query)
        || u.departmentName.toLowerCase().includes(query))
      // Null rates (no sessions held) sort last: there is nothing to act on there.
      .sort((a, b) => (a.avgAttendanceRate ?? 101) - (b.avgAttendanceRate ?? 101))
  }, [units, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Units taught across your faculty this semester, with who teaches each, which department, and how well its classes are attended.</p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit, lecturer or department…"
            aria-label="Search unit, lecturer or department"
            className="input pl-10"
          />
        </label>
        <span className="text-sm text-muted">{units ? `${rows.length} unit${rows.length === 1 ? '' : 's'}` : ''}</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the faculty’s units.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !units ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : units.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No units yet</p>
          <p className="mt-1 text-sm text-muted">Units appear here once a lecturer in this faculty is timetabled to teach one.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No units match your search.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                {HEADERS.map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => <UnitRow key={u.unitId} unit={u} />)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function UnitRow({ unit }: { unit: FacultyUnit }) {
  return (
    <tr className="transition-colors hover:bg-teal-50/60">
      <td className="px-5 py-3">
        <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-100">{unit.unitCode}</span>
      </td>
      <td className="px-5 py-3 text-navy-900">{unit.unitName ?? '—'}</td>
      <td className="px-5 py-3 text-navy-900">{unit.departmentName}</td>
      <td className="px-5 py-3 text-navy-900">{unit.lecturerName}</td>
      <td className="px-5 py-3 text-navy-900">{unit.activeStudents}</td>
      <td className="px-5 py-3"><RateBar rate={unit.avgAttendanceRate} label={`${unit.unitCode} average attendance`} /></td>
    </tr>
  )
}

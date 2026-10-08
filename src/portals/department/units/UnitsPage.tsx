import { BookOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { DepartmentUnit } from '@/types'
import { RateBar } from '../RateBar'
import { useDepartmentUnits } from './unitsApi'

const HEADERS = ['UNIT', 'NAME', 'LECTURER', 'STUDENTS', 'AVG. ATTENDANCE']

/** Every unit taught in the department, worst-attended first. Read-only — an officer reassigns nothing here. */
export function UnitsPage() {
  const { data: units, isPending, error, refetch } = useDepartmentUnits()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (units ?? [])
      .filter((u) => !query || u.code.toLowerCase().includes(query) || (u.name ?? '').toLowerCase().includes(query) || u.lecturerName.toLowerCase().includes(query))
      // Null rates (no sessions held) sort last: there is nothing to act on there.
      .sort((a, b) => (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101))
  }, [units, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Units taught in your department this semester, with who teaches each and how well its classes are attended.</p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit or lecturer…"
            aria-label="Search unit or lecturer"
            className="input pl-10"
          />
        </label>
        <span className="text-sm text-muted">{units ? `${rows.length} unit${rows.length === 1 ? '' : 's'}` : ''}</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the department’s units.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !units ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : units.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No units yet</p>
          <p className="mt-1 text-sm text-muted">Units appear here once a lecturer in this department is timetabled to teach one.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No units match your search.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                {HEADERS.map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => <UnitRow key={u.id} unit={u} />)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function UnitRow({ unit }: { unit: DepartmentUnit }) {
  return (
    <tr className="transition-colors hover:bg-indigo-50/60">
      <td className="px-5 py-3">
        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-100">{unit.code}</span>
      </td>
      <td className="px-5 py-3 text-navy-900">{unit.name ?? '—'}</td>
      <td className="px-5 py-3 text-navy-900">{unit.lecturerName}</td>
      <td className="px-5 py-3 text-navy-900">{unit.studentCount}</td>
      <td className="px-5 py-3"><RateBar rate={unit.attendanceRate} label={`${unit.code} average attendance`} /></td>
    </tr>
  )
}

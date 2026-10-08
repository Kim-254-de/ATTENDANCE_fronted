import { ArrowDown, ArrowUp, ArrowUpDown, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { MIN_REQUIRED_ATTENDANCE } from '@/lib/attendancePolicy'
import { initials } from '@/lib/format'
import type { LecturerStudent } from '@/types'
import { RateBar } from '../RateBar'
import { useDepartmentStudents } from './studentsApi'

type SortKey = 'name' | 'unit' | 'attendance'
type SortDir = 'asc' | 'desc'

/** Below the minimum required to sit the exam counts as At Risk; no sessions yet is given the benefit of the doubt. */
const isAtRisk = (rate: number | null) => rate !== null && rate < MIN_REQUIRED_ATTENDANCE

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Full Name' },
  { key: 'unit', label: 'Unit' },
  { key: 'attendance', label: 'Attendance' },
]

/**
 * The lecturer portal's Students table, widened to the whole department: one
 * row per (student, unit), so a student on three units in this department
 * appears three times — each with its own standing.
 */
export function StudentsPage() {
  const { data: students, isPending, error, refetch } = useDepartmentStudents()
  const [search, setSearch] = useState('')
  const [unitId, setUnitId] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const units = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of students ?? []) seen.set(s.unitId, s.unitCode)
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [students])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = (students ?? []).filter((s) => {
      if (unitId && s.unitId !== unitId) return false
      if (!query) return true
      return (s.fullName ?? '').toLowerCase().includes(query)
        || (s.registrationNumber ?? '').toLowerCase().includes(query)
        || s.unitCode.toLowerCase().includes(query)
        || (s.unitName ?? '').toLowerCase().includes(query)
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'name': return dir * (a.fullName ?? '').localeCompare(b.fullName ?? '')
        case 'unit': return dir * a.unitCode.localeCompare(b.unitCode)
        case 'attendance': return dir * ((a.attendanceRate ?? -1) - (b.attendanceRate ?? -1))
      }
    })
  }, [students, search, unitId, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Every student registered on a unit taught in your department, with their attendance standing in that unit.</p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID or unit…"
            aria-label="Search name, ID or unit"
            className="input pl-10"
          />
        </label>
        {units.length > 1 && (
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label="Filter by unit" className="input w-auto">
            <option value="">All units</option>
            {units.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
          </select>
        )}
        <span className="text-sm text-muted">{students ? `${rows.length} student${rows.length === 1 ? '' : 's'}` : ''}</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the department’s students.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !students ? (
        <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : students.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No students yet</p>
          <p className="mt-1 text-sm text-muted">Students appear here once they are registered on a unit in this department.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No students match your search.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">Student ID</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className="px-5 py-3 font-semibold">
                    <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex cursor-pointer items-center gap-1 hover:text-navy-900">
                      {c.label}
                      {sortKey !== c.key ? <ArrowUpDown className="size-3.5" aria-hidden />
                        : sortDir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-5 py-3 font-semibold">Sessions</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => <StudentRow key={`${s.id}-${s.unitId}`} student={s} />)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function StudentRow({ student }: { student: LecturerStudent }) {
  const atRisk = isAtRisk(student.attendanceRate)
  return (
    <tr className="transition-colors hover:bg-indigo-50/60">
      <td className="px-5 py-3 font-mono text-xs text-muted">{student.registrationNumber ?? '—'}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-700 text-xs font-bold text-white">{initials(student.fullName ?? '?')}</span>
          <span className="font-medium text-navy-900">{student.fullName ?? 'Unnamed student'}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-100" title={student.unitName ?? undefined}>{student.unitCode}</span>
      </td>
      <td className="px-5 py-3"><RateBar rate={student.attendanceRate} label={`${student.fullName ?? 'Student'} attendance in ${student.unitCode}`} /></td>
      <td className="px-5 py-3"><b className="text-navy-900">{student.sessionsAttended}</b><span className="text-muted">/{student.sessionsHeld}</span></td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${atRisk ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 text-success'}`}>
          {atRisk ? 'At Risk' : 'Active'}
        </span>
      </td>
    </tr>
  )
}

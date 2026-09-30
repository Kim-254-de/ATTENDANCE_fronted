import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { RecordRow } from './AttendanceRecordRow'
import { displayMark, groupByDay, MIN_REQUIRED_ATTENDANCE } from './attendanceStats'
import { useMyAttendance } from './studentApi'
import { useAnimated, useFirstVisit } from './useAnimated'

const HISTORY_LIMIT = 200

const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate)}%`)

type StatusFilter = 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT'
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' },
]

/**
 * The full session history the dashboard only previews. `?unitId=` (set by "View attendance →"
 * on a unit card) still pre-filters the fetch server-side; search and the status pills then
 * filter client-side over whatever came back.
 */
export function StudentAttendanceHistoryPage() {
  const [searchParams] = useSearchParams()
  const unitId = searchParams.get('unitId') ?? undefined
  const attendance = useMyAttendance({ unitId, limit: HISTORY_LIMIT })
  const summary = attendance.data?.summary
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')

  const heldRecords = useMemo(() => (attendance.data?.records ?? []).filter((r) => r.mark !== 'OPEN'), [attendance.data])
  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0 }
    for (const r of heldRecords) {
      const mark = displayMark(r)
      if (mark === 'PRESENT') c.present += 1
      else if (mark === 'LATE') c.late += 1
      else if (mark === 'ABSENT') c.absent += 1
    }
    return c
  }, [heldRecords])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (attendance.data?.records ?? []).filter((r) => {
      if (status !== 'ALL' && displayMark(r) !== status) return false
      if (!query) return true
      return r.unitCode.toLowerCase().includes(query) || (r.unitName ?? '').toLowerCase().includes(query) || (r.title ?? '').toLowerCase().includes(query)
    })
  }, [attendance.data, status, search])

  const groups = useMemo(() => groupByDay(visibleRecords), [visibleRecords])

  const rate = summary?.attendanceRate ?? null
  const atRisk = rate !== null && rate < MIN_REQUIRED_ATTENDANCE
  const animate = useFirstVisit('student-history')
  const animatedRate = useAnimated(rate ?? 0, animate)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Attendance Report</h1>
        <p className="mt-2 text-sm text-muted">Your complete attendance history</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={heldRecords.length} className="text-navy-900" />
        <StatCard label="Present" value={counts.present} className="text-success" />
        <StatCard label="Late" value={counts.late} className="text-orange-600" />
        <StatCard label="Absent" value={counts.absent} className="text-red-700" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-navy-900">Overall Attendance Rate</p>
          <p className="text-sm font-bold text-navy-900">{summary ? formatRate(rate) : '…'}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-gold-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
            style={{ width: `${animatedRate}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted">Min required: {MIN_REQUIRED_ATTENDANCE}%</span>
          {summary && (atRisk ? <span className="font-semibold text-red-600">⚠ At Risk</span> : <span className="font-semibold text-success">On Track</span>)}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={status === f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${status === f.value ? 'bg-blue-700 text-white' : 'bg-white text-navy-900 hover:bg-navy-900/5'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by unit name or code…"
          aria-label="Search by unit name or code"
          className="input pl-10"
        />
      </label>

      {attendance.error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(attendance.error, 'Could not load your attendance.')}</p>
          <button onClick={() => attendance.refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : attendance.isPending ? (
        <Skeleton className="h-[240px]" />
      ) : visibleRecords.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          {attendance.data.records.length === 0 ? `No classes have been held for ${unitId ? 'this unit' : 'your units'} yet.` : 'No classes match your filters.'}
        </Card>
      ) : (
        <div className="space-y-4" role="region" aria-label="Class history">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</p>
              <Card className="divide-y divide-line">{g.records.map((r) => <RecordRow key={r.sessionId} record={r} />)}</Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Card role="group" aria-label={`${label}: ${value}`} className="p-4 text-center">
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </Card>
  )
}

import { AlertTriangle, ClipboardCheck, Gauge, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { errorMessage } from '@/lib/api'
import type { QaAttendanceTrendPoint } from '@/types'
import { ExportLinks } from '../exportLinks'
import { TargetFilters } from '../TargetFilters'
import { useQaDashboard, type DashboardFilters } from './dashboardApi'

const CATEGORY_LABELS: Record<string, string> = {
  GOVERNANCE: 'Governance',
  ACADEMIC_PROGRAMS: 'Academic Programs',
  STAFF: 'Staff',
  STUDENTS: 'Students',
  FACILITIES: 'Facilities',
  FINANCE: 'Finance',
  RESEARCH: 'Research',
  COMMUNITY_ENGAGEMENT: 'Community Engagement',
}

/**
 * What a QA officer wants in one glance: how many audits are actually
 * finished, where compliance is weak by standard and category, and how many
 * corrective actions are overdue. Nothing here is an action — every number
 * drills down through the nav.
 */
export function OverviewPage() {
  const [filters, setFilters] = useState<DashboardFilters>({ groupBy: 'month' })
  const { data, isPending, error, refetch } = useQaDashboard(filters)

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">Institution-wide audit completion, compliance by standard, and outstanding corrective actions.</p>
        <ExportLinks basePath="dashboard/export" params={{ ...filters }} label="dashboard report" />
      </div>

      <Card className="p-5">
        <form aria-label="Dashboard filters" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={(e) => e.preventDefault()}>
          <TargetFilters value={filters} onChange={(next) => setFilters({ ...next, groupBy: filters.groupBy })} />
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Trend by
            <select value={filters.groupBy} onChange={(e) => setFilters((f) => ({ ...f, groupBy: e.target.value as 'week' | 'month' }))} className="input">
              <option value="month">Month</option>
              <option value="week">Week</option>
            </select>
          </label>
        </form>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load the KPI dashboard.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : (
        <section aria-label="Key statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isPending || !data ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
          ) : (
            <>
              <StatCard
                icon={Gauge}
                label="Audit Completion"
                value={data.auditCompletionRate === null ? '—' : `${data.auditCompletionRate.toFixed(1)}%`}
                hint={`${data.auditsCompleted} of ${data.auditsTotal} completed`}
                accent
              />
              <StatCard icon={ClipboardCheck} label="Audits" value={data.auditsTotal} hint="Matching the current filters" />
              <StatCard icon={Wrench} label="Overdue Corrective Actions" value={data.overdueCapaCount} hint="Past due date, not yet verified" accent={data.overdueCapaCount > 0} />
            </>
          )}
        </section>
      )}

      {!error && (
        <section aria-label="Compliance by category" className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold text-ink">Compliance by Category</h2>
            {isPending || !data ? (
              <div className="mt-4 space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : data.complianceByCategory.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No findings recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.complianceByCategory.map((c) => (
                  <li key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      <span className="text-muted">{c.avgScore === null ? '—' : `${c.avgScore.toFixed(1)}%`} <span className="text-xs">({c.sampleCount})</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line">
                      <div
                        className={c.avgScore === null ? 'h-full bg-line' : c.avgScore >= 80 ? 'h-full bg-success-solid' : c.avgScore >= 50 ? 'h-full bg-warning-solid' : 'h-full bg-danger-solid'}
                        style={{ width: `${c.avgScore ?? 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-ink">Compliance by Standard</h2>
            {isPending || !data ? (
              <div className="mt-4 space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : data.complianceByStandard.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No findings recorded yet.</p>
            ) : (
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {data.complianceByStandard
                  .slice()
                  .sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0))
                  .map((s) => (
                    <div key={s.standardId} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-xs text-brand-ink">{s.standardCode}</span> {s.standardTitle}
                      </span>
                      <span className="shrink-0 font-semibold text-ink">{s.avgScore === null ? '—' : `${s.avgScore.toFixed(1)}%`}</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {!error && !isPending && data && data.overdueCapaCount > 0 && (
        <Card className="flex items-center gap-3 border border-warning/30 bg-warning-soft p-4">
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="text-sm text-warning">
            {data.overdueCapaCount} corrective action{data.overdueCapaCount === 1 ? '' : 's'} past due date.{' '}
            <Link to="/qa-corrective-actions" className="font-semibold underline">See Corrective Actions</Link>
          </p>
        </Card>
      )}

      {!error && (
        <Card className="p-5">
          <h2 className="font-semibold text-ink">Attendance Rate Trend</h2>
          <p className="mt-0.5 text-sm text-muted">Average share of enrolled students present per class, by department — the same figure each department's own officer sees.</p>
          {isPending || !data ? (
            <Skeleton className="mt-4 h-32" />
          ) : data.attendanceTrends.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No classes held in this period.</p>
          ) : (
            <AttendanceTrendTable points={data.attendanceTrends} groupBy={filters.groupBy ?? 'month'} />
          )}
        </Card>
      )}
    </div>
  )
}

const rateClass = (rate: number) => (rate >= 80 ? 'text-success' : rate >= 50 ? 'text-warning' : 'text-danger')

/** Departments down, periods across — a table rather than a chart, so every figure can be read exactly. */
function AttendanceTrendTable({ points, groupBy }: { points: QaAttendanceTrendPoint[]; groupBy: 'week' | 'month' }) {
  const { periods, rows } = useMemo(() => {
    const periods = [...new Set(points.map((p) => p.periodStart))].sort()
    const byDepartment = new Map<string, { name: string; rates: Map<string, number> }>()
    for (const p of points) {
      const row = byDepartment.get(p.departmentId) ?? { name: p.departmentName, rates: new Map() }
      row.rates.set(p.periodStart, p.avgAttendanceRate)
      byDepartment.set(p.departmentId, row)
    }
    const rows = [...byDepartment.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))
    return { periods, rows }
  }, [points])

  const periodLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, groupBy === 'month' ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-muted">
            <th scope="col" className="py-2 pr-4">Department</th>
            {periods.map((p) => <th key={p} scope="col" className="px-3 py-2 text-right">{groupBy === 'week' ? `Wk of ${periodLabel(p)}` : periodLabel(p)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, row]) => (
            <tr key={id} className="border-b border-line last:border-0">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-ink">{row.name}</th>
              {periods.map((p) => {
                const rate = row.rates.get(p)
                return (
                  <td key={p} className={`px-3 py-2 text-right font-semibold ${rate === undefined ? 'text-muted' : rateClass(rate)}`}>
                    {rate === undefined ? '—' : `${rate.toFixed(1)}%`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

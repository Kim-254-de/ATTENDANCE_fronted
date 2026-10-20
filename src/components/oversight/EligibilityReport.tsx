import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Clock, Search, ShieldAlert } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { EligibilityReport as Report, EligibilityStatus } from '@/types'

const STATUS: Record<EligibilityStatus, { label: string; className: string }> = {
  NOT_ELIGIBLE: { label: 'Not eligible', className: 'bg-danger-soft text-danger ring-danger/30' },
  AT_RISK: { label: 'At risk', className: 'bg-warning-soft text-warning ring-warning/30' },
  ELIGIBLE: { label: 'Eligible', className: 'bg-success-soft text-success ring-success/30' },
  NOT_YET_MEASURED: { label: 'No classes yet', className: 'bg-surface text-muted ring-line' },
}

export function EligibilityStatusBadge({ status }: { status: EligibilityStatus }) {
  const s = STATUS[status]
  return <span className={clsx('inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', s.className)}>{s.label}</span>
}

interface Props {
  data: Report | undefined
  isPending: boolean
  error: unknown
  refetch: () => void
  showAll: boolean
  onShowAllChange: (next: boolean) => void
  /** Faculty and QA span several departments, so they show which one owns each unit. */
  showDepartment?: boolean
  /** Filters (department, faculty) the page puts above the report. */
  filters?: ReactNode
}

/**
 * The exam-eligibility report, shared by the department, faculty and QA portals: summary
 * counts against the institution's minimum attendance, then the students who are below it or
 * close to it, worst first. Each row is one student on one unit, the way the rule is applied.
 */
export function EligibilityReport({ data, isPending, error, refetch, showAll, onShowAllChange, showDepartment, filters }: Props) {
  const [search, setSearch] = useState('')
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => !q
      || (r.fullName ?? '').toLowerCase().includes(q)
      || (r.registrationNumber ?? '').toLowerCase().includes(q)
      || r.unitCode.toLowerCase().includes(q)
      || r.lecturerName.toLowerCase().includes(q))
  }, [data, search])

  if (error) {
    return (
      <Card className="flex items-center justify-between p-5" role="alert">
        <p className="text-sm text-danger">{errorMessage(error, 'Could not load exam eligibility.')}</p>
        <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
      </Card>
    )
  }

  const policy = data?.policy
  const summary = data?.summary

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Minimum to sit an exam: <strong className="text-ink">{policy ? `${policy.minAttendancePercent}%` : '…'}</strong> of a unit’s classes so far.
      </p>

      {filters && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{filters}</div>}

      <section aria-label="Eligibility summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile icon={ShieldAlert} label="Not eligible" value={summary?.notEligible} tone="text-danger bg-danger-soft" />
        <SummaryTile icon={AlertTriangle} label="At risk" value={summary?.atRisk} tone="text-warning bg-warning-soft" />
        <SummaryTile icon={CheckCircle2} label="Eligible" value={summary?.eligible} tone="text-success bg-success-soft" />
        <SummaryTile icon={Clock} label="No classes yet" value={summary?.notYetMeasured} tone="text-muted bg-surface" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, unit or lecturer…" aria-label="Search student, unit or lecturer" className="input pl-10" />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={showAll} onChange={(e) => onShowAllChange(e.target.checked)} className="size-4 accent-brand" />
          Show every student
        </label>
      </div>

      {isPending || !data ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : data.rows.length === 0 ? (
        <Card className="p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
          <p className="mt-3 font-semibold text-ink">{showAll ? 'No students yet' : 'Nobody is at risk'}</p>
          <p className="mt-1 text-sm text-muted">{showAll ? 'Students appear here once they are registered on a unit.' : 'Every student with classes held is comfortably above the minimum.'}</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No students match your search.</Card>
      ) : (
        <>
          {/* Phones: one card per student, so the standing is never scrolled out of view. */}
          <ul className="space-y-3 sm:hidden">
            {rows.map((r) => (
              <li key={r.allocationId}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{r.fullName ?? 'Not signed up yet'}</p>
                      <p className="font-mono text-xs text-muted">{r.registrationNumber ?? '—'}</p>
                    </div>
                    <EligibilityStatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{r.unitCode}</p>
                      <p className="truncate text-xs text-muted">{r.lecturerName}{showDepartment && r.departmentName ? ` · ${r.departmentName}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-ink">{r.attendanceRate === null ? '—' : `${r.attendanceRate}%`}</p>
                      <p className="text-xs text-muted">{r.sessionsAttended} of {r.sessionsHeld} classes</p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Card className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Unit</th>
                  {showDepartment && <th scope="col" className="px-5 py-3 font-semibold">Department</th>}
                  <th scope="col" className="px-5 py-3 font-semibold">Attended</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.allocationId}>
                    <td className="px-5 py-3">
                      <span className="block font-medium text-ink">{r.fullName ?? 'Not signed up yet'}</span>
                      <span className="font-mono text-xs text-muted">{r.registrationNumber ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-ink">{r.unitCode}</span>
                      <span className="text-xs text-muted">{r.lecturerName}</span>
                    </td>
                    {showDepartment && <td className="px-5 py-3 text-ink">{r.departmentName ?? '—'}</td>}
                    <td className="px-5 py-3 text-ink">
                      <span className="font-semibold">{r.attendanceRate === null ? '—' : `${r.attendanceRate}%`}</span>
                      <span className="block text-xs text-muted">{r.sessionsAttended} of {r.sessionsHeld} classes</span>
                    </td>
                    <td className="px-5 py-3"><EligibilityStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: number | undefined; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-2xl font-bold leading-tight text-ink">{value ?? '—'}</p>
      </div>
    </Card>
  )
}

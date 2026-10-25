import { useState, type FormEvent } from 'react'
import { EligibilityReport } from '@/components/oversight/EligibilityReport'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { useAttendancePolicy } from '@/lib/attendancePolicy'
import type { AttendancePolicy } from '@/types'
import { TargetFilters, type TargetFilterValues } from '../TargetFilters'
import { useQaEligibility, useUpdatePolicy } from './eligibilityApi'

/**
 * The exam-eligibility rule and who it catches. The Senate decides the minimum; QA keeps the
 * system in line with it here, and every portal (students, lecturers, departments)
 * judges attendance against the same number.
 */
export function EligibilityPage() {
  const [showAll, setShowAll] = useState(false)
  const [filters, setFilters] = useState<TargetFilterValues>({})
  const report = useQaEligibility({ all: showAll, departmentId: filters.targetDepartmentId })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PolicyForm />
      <EligibilityReport
        data={report.data}
        isPending={report.isPending}
        error={report.error}
        refetch={report.refetch}
        showAll={showAll}
        onShowAllChange={setShowAll}
        showDepartment
        filters={<TargetFilters value={filters} onChange={setFilters} dates={false} />}
      />
    </div>
  )
}

function PolicyForm() {
  const { data: policy } = useAttendancePolicy()
  if (!policy) return <Card className="h-40 animate-pulse p-5" aria-hidden />
  // Keyed on the saved value, so the inputs start from it again after every save.
  return <PolicyFields key={policy.updatedAt} policy={policy} />
}

function PolicyFields({ policy }: { policy: AttendancePolicy }) {
  const update = useUpdatePolicy()
  const [min, setMin] = useState(String(policy.minAttendancePercent))
  const [margin, setMargin] = useState(String(policy.atRiskMarginPercent))

  const changed = Number(min) !== policy.minAttendancePercent || Number(margin) !== policy.atRiskMarginPercent
  const valid = Number(min) >= 1 && Number(min) <= 100 && Number(margin) >= 0 && Number(margin) <= 50

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!changed || !valid) return
    update.mutate({ minAttendancePercent: Number(min), atRiskMarginPercent: Number(margin) })
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-ink">Attendance rule</h2>
      <p className="mt-1 text-sm text-muted">Set by the Senate. Applies to every portal; changes are logged.</p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          Minimum attendance (%)
          <input type="number" min={1} max={100} step="0.01" value={min} onChange={(e) => setMin(e.target.value)} className="input w-40" required />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          At-risk margin (points)
          <input type="number" min={0} max={50} step="0.5" value={margin} onChange={(e) => setMargin(e.target.value)} className="input w-40" required />
        </label>
        <Button type="submit" loading={update.isPending} disabled={!changed || !valid}>Save rule</Button>
      </form>
      {policy.updatedByName && (
        <p className="mt-3 text-xs text-muted">Last changed by {policy.updatedByName} on {new Date(policy.updatedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}.</p>
      )}
      {update.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(update.error)}</p>}
    </Card>
  )
}

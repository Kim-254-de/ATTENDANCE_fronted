import { useState } from 'react'
import { EligibilityReport } from '@/components/oversight/EligibilityReport'
import { useFacultyDepartments } from '../departments/departmentsApi'
import { useFacultyEligibility } from './eligibilityApi'

/** Exam eligibility across the faculty, optionally narrowed to one department. */
export function EligibilityPage() {
  const [showAll, setShowAll] = useState(false)
  const [departmentId, setDepartmentId] = useState('')
  const { data, isPending, error, refetch } = useFacultyEligibility({ all: showAll, departmentId: departmentId || undefined })
  const { data: departments } = useFacultyDepartments()
  return (
    <div className="mx-auto max-w-6xl">
      <EligibilityReport
        data={data}
        isPending={isPending}
        error={error}
        refetch={refetch}
        showAll={showAll}
        onShowAllChange={setShowAll}
        showDepartment
        filters={
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Department
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input">
              <option value="">All departments</option>
              {departments?.map((d) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
            </select>
          </label>
        }
      />
    </div>
  )
}

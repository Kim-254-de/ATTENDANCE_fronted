import { useState } from 'react'
import { EligibilityReport } from '@/components/oversight/EligibilityReport'
import { useDepartmentEligibility } from './eligibilityApi'

/** Exam eligibility on the department's units: who is below the minimum attendance, and who is close to it. */
export function EligibilityPage() {
  const [showAll, setShowAll] = useState(false)
  const { data, isPending, error, refetch } = useDepartmentEligibility(showAll)
  return (
    <div className="mx-auto max-w-6xl">
      <EligibilityReport data={data} isPending={isPending} error={error} refetch={refetch} showAll={showAll} onShowAllChange={setShowAll} />
    </div>
  )
}

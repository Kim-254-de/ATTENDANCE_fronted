import { EvaluationRoundList } from '@/components/oversight/EvaluationRoundList'
import { useDepartmentEvaluations } from './evaluationsApi'

/** Student course evaluations the QA directorate has run; each opens to this department's results. */
export function EvaluationsPage() {
  const { data, isPending, error, refetch } = useDepartmentEvaluations()
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">What students said about your department’s units.</p>
      <EvaluationRoundList rounds={data} isPending={isPending} error={error} refetch={refetch} linkTo={(id) => `/department-evaluations/${id}`} />
    </div>
  )
}

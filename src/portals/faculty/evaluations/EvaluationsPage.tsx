import { EvaluationRoundList } from '@/components/oversight/EvaluationRoundList'
import { useFacultyEvaluations } from './evaluationsApi'

/** Student course evaluations the QA directorate has run; each opens to this faculty's results. */
export function EvaluationsPage() {
  const { data, isPending, error, refetch } = useFacultyEvaluations()
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">What students said about the units your faculty’s departments own. Responses are anonymous.</p>
      <EvaluationRoundList rounds={data} isPending={isPending} error={error} refetch={refetch} linkTo={(id) => `/faculty-evaluations/${id}`} />
    </div>
  )
}

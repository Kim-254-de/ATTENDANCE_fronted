import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { EvaluationResultsView } from '@/components/oversight/EvaluationResultsView'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useDepartmentEvaluationResults } from './evaluationsApi'

export function EvaluationResultsPage() {
  const { roundId } = useParams()
  const { data, isPending, error, refetch } = useDepartmentEvaluationResults(roundId)
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/department-evaluations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All evaluations
      </Link>
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load these results.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <EvaluationResultsView results={data} />
      )}
    </div>
  )
}

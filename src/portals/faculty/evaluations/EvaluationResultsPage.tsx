import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EvaluationResultsView } from '@/components/oversight/EvaluationResultsView'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useFacultyDepartments } from '../departments/departmentsApi'
import { useFacultyEvaluationResults } from './evaluationsApi'

export function EvaluationResultsPage() {
  const { roundId } = useParams()
  const [departmentId, setDepartmentId] = useState('')
  const { data, isPending, error, refetch } = useFacultyEvaluationResults(roundId, departmentId || undefined)
  const { data: departments } = useFacultyDepartments()
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/faculty-evaluations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> All evaluations
        </Link>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Filter by department" className="input w-full sm:w-64">
          <option value="">All departments</option>
          {departments?.map((d) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
        </select>
      </div>
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load these results.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <EvaluationResultsView results={data} showDepartment />
      )}
    </div>
  )
}

import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useUnits } from '@/features/dashboard/dashboardApi'
import { errorMessage } from '@/lib/api'
import type { Unit } from '@/types'

export function AttendanceReportsPage() {
  const { data: units, isPending, error, refetch } = useUnits()

  if (error) {
    return (
      <Card className="flex items-center justify-between p-5" role="alert">
        <p className="text-sm text-red-700">{errorMessage(error, 'Could not load attendance reports.')}</p>
        <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
      </Card>
    )
  }

  if (isPending || !units) {
    return <div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[140px]" />)}</div>
  }

  if (units.length === 0) {
    return <Card className="p-10 text-center text-sm text-muted">No units assigned yet.</Card>
  }

  return (
    <div className="space-y-4">
      {units.map((unit) => <UnitReportCard key={unit.id} unit={unit} />)}
    </div>
  )
}

function rateColour(rate: number) {
  if (rate >= 90) return { text: 'text-success', bar: 'bg-success' }
  if (rate >= 70) return { text: 'text-gold-500', bar: 'bg-gold-500' }
  return { text: 'text-red-600', bar: 'bg-red-600' }
}

function UnitReportCard({ unit }: { unit: Unit }) {
  const { text, bar } = rateColour(unit.attendanceRate)
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{unit.code}</span>
        <span className={`text-lg font-bold ${text}`}>{unit.attendanceRate}%</span>
      </div>
      <h3 className="font-semibold text-navy-900">{unit.name}</h3>
      <div className="h-1.5 w-full rounded-full bg-line" role="img" aria-label={`${unit.attendanceRate}% average attendance`}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${unit.attendanceRate}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{unit.studentCount} students</span>
        <span>{unit.creditHours} cr. hrs</span>
      </div>
    </Card>
  )
}

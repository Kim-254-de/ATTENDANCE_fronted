import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useMyStudentUnits } from './studentApi'
import { UnitCard } from './StudentUnitCard'

/** The full list of units the student is on — the dashboard only shows a preview of this. */
export function StudentUnitsPage() {
  const units = useMyStudentUnits()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-gold-600">STUDENT WORKSPACE</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">My units</h1>
        <p className="mt-2 text-sm text-muted">Every unit you're registered for, with your attendance rate in each.</p>
      </div>

      {units.error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(units.error, 'Could not load your units.')}</p>
          <button onClick={() => units.refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : units.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[150px]" />)}</div>
      ) : units.data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          You aren't registered for any units this term yet. Units appear here once you're registered for them on the
          timetable app.
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">{units.data.map((u) => <UnitCard key={u.id ?? u.code} unit={u} />)}</ul>
      )}
    </div>
  )
}

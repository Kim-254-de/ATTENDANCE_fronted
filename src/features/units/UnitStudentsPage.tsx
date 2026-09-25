import { ArrowLeft, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { Allocation } from '@/types'
import { useMyUnits, useUnitStudents } from './unitsApi'

/**
 * Who is on one unit. Read-only: enrolment is the registrar's record, held in
 * the ERP, and the backend re-syncs this list from there on every load — a
 * lecturer neither adds students nor approves or removes them.
 */
export function UnitStudentsPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const { data: units } = useMyUnits()
  const unit = units?.find((u) => u.id === unitId)
  const { data: students, isPending, error, refetch } = useUnitStudents(unitId)

  const active = students?.filter((s) => s.status === 'ACTIVE') ?? []
  const dropped = students?.filter((s) => s.status !== 'ACTIVE') ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/units" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy-900">
          <ArrowLeft className="size-4" aria-hidden /> All units
        </Link>
        <p className="mt-3 text-sm font-semibold text-gold-600">{unit?.code ?? 'UNIT'}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{unit?.name ?? unit?.code ?? 'Students'}</h2>
        {students && <p className="mt-2 text-sm text-muted">{active.length} {active.length === 1 ? 'student' : 'students'} can check in</p>}
      </div>

      <Card className="flex items-start gap-3 p-4">
        <Users className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
        <p className="text-sm text-muted">
          This list comes from the registrar's enrolment records and refreshes each time you open it.
          Speak to your department if someone is missing or shouldn't be here.
        </p>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the students on this unit.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !students ? (
        <Skeleton className="h-[200px]" />
      ) : (
        <>
          <StudentSection
            title="Students"
            students={active}
            empty="Nobody is enrolled on this unit yet."
          />
          {dropped.length > 0 && (
            <StudentSection
              title="No longer enrolled"
              hint="These students were on the unit before and cannot check in now."
              students={dropped}
            />
          )}
        </>
      )}
    </div>
  )
}

function StudentSection({ title, hint, empty, students }: {
  title: string
  hint?: string
  empty?: string
  students: Allocation[]
}) {
  return (
    <section aria-label={title}>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-semibold text-navy-900">{title} <span className="font-normal text-muted">({students.length})</span></h3>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {students.length === 0 ? (
          <p className="p-5 text-sm text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {students.map((s) => <StudentRow key={s.id} student={s} />)}
          </ul>
        )}
      </Card>
    </section>
  )
}

function StudentRow({ student }: { student: Allocation }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{student.fullName ?? 'Unnamed student'}</span>
        <span className="text-xs text-muted">
          {student.registrationNumber && <span className="font-mono">{student.registrationNumber}</span>}
          {student.status === 'ACTIVE' && !student.hasAccount && <span> · hasn't registered yet</span>}
        </span>
      </span>
    </li>
  )
}

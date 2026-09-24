import { ArrowLeft, Check, UserPlus, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { Allocation, AllocationResult, AllocationResultStatus } from '@/types'
import { parseRegistrationNumbers, useAddStudents, useMyUnits, useSetAllocationStatus, useUnitStudents } from './unitsApi'

/**
 * Who is on one unit. Students get here two ways: the lecturer pastes their
 * registration numbers (checked against the student records system), or a
 * student asks to join and waits in "Requests" for approval.
 */
export function UnitStudentsPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const { data: units } = useMyUnits()
  const unit = units?.find((u) => u.id === unitId)
  const { data: students, isPending, error, refetch } = useUnitStudents(unitId)

  const pending = students?.filter((s) => s.status === 'PENDING') ?? []
  const active = students?.filter((s) => s.status === 'ACTIVE') ?? []
  const dropped = students?.filter((s) => s.status === 'DROPPED') ?? []

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

      <AddStudentsForm unitId={unitId} />

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the students on this unit.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !students ? (
        <Skeleton className="h-[200px]" />
      ) : (
        <>
          {pending.length > 0 && (
            <StudentSection title="Requests to join" hint="These students asked to join. They can't check in until you approve." unitId={unitId} students={pending} />
          )}
          <StudentSection
            title="Students"
            unitId={unitId}
            students={active}
            empty="No students yet. Add registration numbers above, or share the unit code so students can ask to join."
          />
          {dropped.length > 0 && <StudentSection title="Removed" unitId={unitId} students={dropped} />}
        </>
      )}
    </div>
  )
}

function AddStudentsForm({ unitId }: { unitId: string | undefined }) {
  const id = useId()
  const add = useAddStudents(unitId)
  const [text, setText] = useState('')
  const numbers = parseRegistrationNumbers(text)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    add.mutate(numbers, {
      // Keep only the numbers that did not go through, so they can be corrected and resubmitted.
      onSuccess: (results) => setText(results.filter((r) => !isSuccess(r.status)).map((r) => r.registrationNumber).join('\n')),
    })
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor={id} className="flex items-center gap-2 font-semibold text-navy-900">
          <UserPlus className="size-4 text-gold-600" aria-hidden /> Add students
        </label>
        <p className="text-sm text-muted">Paste registration numbers, one per line or separated by commas. Each is checked against the student records system.</p>
        <textarea
          id={id}
          className="input !h-28 resize-y py-2 font-mono uppercase"
          placeholder={'SC211/0001/2022\nSC211/0002/2022'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{numbers.length > 0 && `${numbers.length} to add`}</span>
          <Button type="submit" loading={add.isPending} disabled={numbers.length === 0 || numbers.length > 300}>Add students</Button>
        </div>
        {numbers.length > 300 && <p className="text-sm text-red-600">Add at most 300 students at a time.</p>}
        {add.error && <p role="alert" className="text-sm text-red-600">{errorMessage(add.error)}</p>}
        {add.data && <AddResults results={add.data} />}
      </form>
    </Card>
  )
}

const isSuccess = (status: AllocationResultStatus) => status === 'ADDED' || status === 'RESTORED' || status === 'ALREADY_ALLOCATED'

const RESULT_TEXT: Record<AllocationResultStatus, string> = {
  ADDED: 'Added',
  RESTORED: 'Added back',
  ALREADY_ALLOCATED: 'Already on this unit',
  NOT_FOUND: 'Not found in student records',
  INACTIVE: 'Not an active student',
  UNAVAILABLE: 'Student records unavailable — try again',
}

function AddResults({ results }: { results: AllocationResult[] }) {
  const added = results.filter((r) => r.status === 'ADDED' || r.status === 'RESTORED').length
  const problems = results.filter((r) => !isSuccess(r.status))
  return (
    <div role="status" className="space-y-2 rounded-xl bg-surface p-3 text-sm">
      <p className="font-semibold text-navy-900">
        {added} added{problems.length > 0 && `, ${problems.length} not added`}
      </p>
      {problems.length > 0 && (
        <ul className="space-y-1">
          {problems.map((r) => (
            <li key={r.registrationNumber} className="flex justify-between gap-3">
              <span className="font-mono">{r.registrationNumber}</span>
              <span className="text-red-600">{RESULT_TEXT[r.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StudentSection({ title, hint, empty, unitId, students }: {
  title: string
  hint?: string
  empty?: string
  unitId: string | undefined
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
            {students.map((s) => <StudentRow key={s.id} unitId={unitId} student={s} />)}
          </ul>
        )}
      </Card>
    </section>
  )
}

function StudentRow({ unitId, student }: { unitId: string | undefined; student: Allocation }) {
  const setStatus = useSetAllocationStatus(unitId)
  const change = (status: 'ACTIVE' | 'DROPPED') => setStatus.mutate({ allocationId: student.id, status })
  const label = student.fullName ?? student.registrationNumber ?? 'Student'

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{student.fullName ?? 'Unnamed student'}</span>
        <span className="text-xs text-muted">
          {student.registrationNumber && <span className="font-mono">{student.registrationNumber}</span>}
          {student.status === 'ACTIVE' && !student.hasAccount && <span> · hasn't registered yet</span>}
        </span>
      </span>
      {setStatus.error && <span role="alert" className="text-xs text-red-600">{errorMessage(setStatus.error)}</span>}
      {student.status === 'PENDING' && (
        <>
          <Button className="!h-9 !px-3" onClick={() => change('ACTIVE')} loading={setStatus.isPending} aria-label={`Approve ${label}`}>
            <Check className="size-4" aria-hidden /> Approve
          </Button>
          <Button variant="ghost" className="!h-9 !px-3" onClick={() => change('DROPPED')} disabled={setStatus.isPending} aria-label={`Decline ${label}`}>
            Decline
          </Button>
        </>
      )}
      {student.status === 'ACTIVE' && (
        <Button
          variant="ghost"
          className="!h-9 !px-3 text-red-600 hover:bg-red-50"
          onClick={() => window.confirm(`Remove ${label} from this unit? They will no longer be able to check in.`) && change('DROPPED')}
          disabled={setStatus.isPending}
          aria-label={`Remove ${label}`}
        >
          <X className="size-4" aria-hidden /> Remove
        </Button>
      )}
      {student.status === 'DROPPED' && (
        <Button variant="secondary" className="!h-9 !px-3" onClick={() => change('ACTIVE')} loading={setStatus.isPending} aria-label={`Restore ${label}`}>
          Restore
        </Button>
      )}
    </li>
  )
}

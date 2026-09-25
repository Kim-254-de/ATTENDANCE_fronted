import { BookOpen, Clock, Plus, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { rateColour, useUnitAttendanceRates } from '@/features/attendance/reportingApi'
import { errorMessage, fieldErrors } from '@/lib/api'
import type { TaughtUnit } from '@/types'
import { useCreateUnit, useMyUnits } from './unitsApi'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const formatSchedule = (schedule: TaughtUnit['schedule']) =>
  schedule ? `${DAYS[schedule.dayOfWeek]} ${schedule.startTime}–${schedule.endTime}` : null

/**
 * The units a lecturer teaches. A unit must exist here before a class can be
 * activated for it — but a lecturer only ever types a code: its name and
 * schedule are looked up automatically against the ERP's issued timetable
 * (unit.service.ts). If that timetable doesn't already list this lecturer as
 * the one assigned to teach it, the unit lands PENDING_VERIFICATION and an
 * administrator is notified to confirm the assignment by hand; no class can
 * be activated for it until that happens — see session.service.ts.
 */
export function UnitsPage() {
  const { data: units, isPending, error, refetch } = useMyUnits()
  const rateByUnit = useUnitAttendanceRates()
  const [adding, setAdding] = useState(false)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gold-600">TEACHING</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Your units</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">Manage your allocated course units for this semester. Only students on a unit can check in to its classes.</p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Add unit
          </Button>
        )}
      </div>

      {adding && <AddUnitForm onDone={() => setAdding(false)} />}

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load your units.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !units ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[168px]" />)}</div>
      ) : units.length === 0 ? (
        !adding && (
          <Card className="p-10 text-center">
            <BookOpen className="mx-auto size-8 text-muted" aria-hidden />
            <p className="mt-3 font-semibold text-navy-900">No units yet</p>
            <p className="mt-1 text-sm text-muted">Add the first unit you teach to start taking attendance.</p>
          </Card>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {units.map((unit) => <UnitCard key={unit.id} unit={unit} rate={rateByUnit.get(unit.id)} />)}
        </ul>
      )}
    </div>
  )
}

function UnitCard({ unit, rate }: { unit: TaughtUnit; rate: number | undefined }) {
  const pending = unit.status === 'PENDING_VERIFICATION'
  const { text, bar } = rateColour(rate ?? 0)

  return (
    <li>
      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{unit.code}</span>
          {pending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-600">
              <Clock className="size-3.5" aria-hidden /> Pending verification
            </span>
          ) : rate !== undefined ? (
            <span className={`text-lg font-bold ${text}`}>{rate.toFixed(0)}%</span>
          ) : (
            <span className="text-xs text-muted">No sessions yet</span>
          )}
        </div>

        <div>
          <h3 className="truncate font-semibold text-navy-900">{unit.name ?? unit.code}</h3>
          {formatSchedule(unit.schedule) && <p className="text-xs text-muted">{formatSchedule(unit.schedule)}</p>}
        </div>

        <div className="h-1.5 w-full rounded-full bg-line" role="img" aria-label={pending ? 'Awaiting verification' : `${(rate ?? 0).toFixed(0)}% average attendance`}>
          {!pending && <div className={`h-full rounded-full ${bar}`} style={{ width: `${rate ?? 0}%` }} />}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span className="flex items-center gap-1">
            <UserRound className="size-3.5" aria-hidden />
            {unit.studentCount} {unit.studentCount === 1 ? 'student' : 'students'}
          </span>
          <span className="text-xs">Avg. attendance</span>
        </div>

        <div className="flex items-center gap-4 border-t border-line pt-3 text-sm font-semibold">
          <Link to={`/units/${unit.id}`} className="text-navy-900 hover:underline">Roster</Link>
          <Link to={`/attendance?unit=${unit.id}`} className="text-navy-900 hover:underline">Attendance</Link>
        </div>
      </Card>
    </li>
  )
}

function AddUnitForm({ onDone }: { onDone: () => void }) {
  const id = useId()
  const create = useCreateUnit()
  const [code, setCode] = useState('')
  const fields = fieldErrors(create.error)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    create.mutate({ code }, { onSuccess: onDone })
  }

  return (
    <Card className="border border-gold-500/30 p-5">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <h3 className="font-semibold text-navy-900">Add a unit</h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
            <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Its name and schedule are looked up from the issued timetable. If the timetable doesn't already list you as its lecturer, an administrator confirms that before classes can be activated for it.
          </p>
        </div>
        <div className="max-w-xs space-y-1.5">
          <label htmlFor={`${id}-code`} className="text-sm font-medium text-navy-900">Unit code</label>
          <input
            id={`${id}-code`}
            className="input uppercase"
            placeholder="COSC 100"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={32}
            required
            autoFocus
            aria-invalid={!!fields.code || undefined}
          />
          {fields.code && <p className="text-xs text-red-600">{fields.code}</p>}
        </div>
        {create.error && !fields.code && (
          <p role="alert" className="text-sm text-red-600">{errorMessage(create.error)}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit" loading={create.isPending} disabled={!code.trim()}>
            Add unit
          </Button>
        </div>
      </form>
    </Card>
  )
}

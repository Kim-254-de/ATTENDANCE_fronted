import { BookOpen, ChevronRight, Plus, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage, fieldErrors } from '@/lib/api'
import type { TaughtUnit } from '@/types'
import { useCreateUnit, useMyUnits } from './unitsApi'

/**
 * The units a lecturer teaches. Until units come from the ERP, lecturers add
 * their own here — a unit must exist before a class can be activated for it.
 */
export function UnitsPage() {
  const { data: units, isPending, error, refetch } = useMyUnits()
  const [adding, setAdding] = useState(false)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gold-600">TEACHING</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Your units</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">Add the units you teach, then put students on them. Only students on a unit can check in to its classes.</p>
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
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      ) : units.length === 0 ? (
        !adding && (
          <Card className="p-10 text-center">
            <BookOpen className="mx-auto size-8 text-muted" aria-hidden />
            <p className="mt-3 font-semibold text-navy-900">No units yet</p>
            <p className="mt-1 text-sm text-muted">Add the first unit you teach to start taking attendance.</p>
          </Card>
        )
      ) : (
        <ul className="space-y-3">
          {units.map((unit) => <UnitRow key={unit.id} unit={unit} />)}
        </ul>
      )}
    </div>
  )
}

function UnitRow({ unit }: { unit: TaughtUnit }) {
  return (
    <li>
      <Link to={`/units/${unit.id}`} className="block">
        <Card className="flex items-center gap-4 p-4 transition hover:shadow-md">
          <span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{unit.code}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-navy-900">{unit.name ?? unit.code}</span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <UserRound className="size-3.5" aria-hidden />
              {unit.studentCount} {unit.studentCount === 1 ? 'student' : 'students'}
            </span>
          </span>
          {unit.pendingCount > 0 && (
            <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-600">
              {unit.pendingCount} to approve
            </span>
          )}
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Card>
      </Link>
    </li>
  )
}

function AddUnitForm({ onDone }: { onDone: () => void }) {
  const id = useId()
  const create = useCreateUnit()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const fields = fieldErrors(create.error)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    create.mutate({ code, name }, { onSuccess: onDone })
  }

  return (
    <Card className="border border-gold-500/30 p-5">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <h3 className="font-semibold text-navy-900">Add a unit</h3>
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <label htmlFor={`${id}-name`} className="text-sm font-medium text-navy-900">Unit name</label>
            <input
              id={`${id}-name`}
              className="input"
              placeholder="Introduction to Computer Science"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
              aria-invalid={!!fields.name || undefined}
            />
            {fields.name && <p className="text-xs text-red-600">{fields.name}</p>}
          </div>
        </div>
        {create.error && !fields.name && <p role="alert" className="text-sm text-red-600">{errorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit" loading={create.isPending} disabled={!code.trim() || !name.trim()}>Add unit</Button>
        </div>
      </form>
    </Card>
  )
}

import { Search, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { PlacementLecturer, PlacementResult } from '@/types'

export interface PlacementDepartment {
  id: string
  name: string
  /** The department's code, shown next to its name. */
  code?: string | null
}

interface Props {
  lecturers: PlacementLecturer[] | undefined
  isPending: boolean
  error: unknown
  refetch: () => void
  departments: PlacementDepartment[]
  search: string
  onSearchChange: (next: string) => void
  unassignedOnly: boolean
  onUnassignedOnlyChange: (next: boolean) => void
  onMove: (lecturerUserId: string, departmentId: string) => Promise<PlacementResult>
}

/**
 * Placing lecturers in departments, from the administrator's console (any department). A lecturer whose SMARTTT department name matched nothing
 * here signs in unassigned and counts toward no department until someone places them, so those
 * are listed first with the name SMARTTT gave.
 */
export function LecturerPlacement(props: Props) {
  const { lecturers, isPending, error, refetch, search, onSearchChange, unassignedOnly, onUnassignedOnlyChange } = props
  const unassignedCount = lecturers?.filter((l) => l.departmentId === null).length ?? 0

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Lecturers SMARTTT couldn’t match to a department come first. Place them once; their spelling is remembered.</p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search name or staff number…" aria-label="Search name or staff number" className="input pl-10" />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => onUnassignedOnlyChange(e.target.checked)} className="size-4 accent-brand" />
          Unassigned only
        </label>
        {lecturers && <span className="text-sm text-muted">{unassignedCount} unassigned</span>}
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load lecturers.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !lecturers ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : lecturers.length === 0 ? (
        <Card className="p-10 text-center">
          <UserCheck className="mx-auto size-8 text-success" aria-hidden />
          <p className="mt-3 font-semibold text-ink">{unassignedOnly ? 'Every lecturer has a department' : 'No lecturers found'}</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lecturers.map((l) => <PlacementRow key={l.userId} lecturer={l} departments={props.departments} onMove={props.onMove} />)}
        </ul>
      )}
    </div>
  )
}

function PlacementRow({ lecturer, departments, onMove }: { lecturer: PlacementLecturer; departments: PlacementDepartment[]; onMove: Props['onMove'] }) {
  const [departmentId, setDepartmentId] = useState('')
  const [pending, setPending] = useState(false)
  const [moveError, setMoveError] = useState<unknown>(null)
  const [learned, setLearned] = useState<PlacementResult | null>(null)
  const unassigned = lecturer.departmentId === null
  const choices = departments.filter((d) => d.id !== lecturer.departmentId)

  const move = async () => {
    if (!departmentId) return
    setPending(true)
    setMoveError(null)
    try {
      const result = await onMove(lecturer.userId, departmentId)
      setLearned(result.learnedSpelling ? result : null)
      setDepartmentId('')
    } catch (e) {
      setMoveError(e)
    } finally {
      setPending(false)
    }
  }

  return (
    <li>
      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className={unassigned ? 'grid size-9 shrink-0 place-items-center rounded-full bg-warning-soft text-warning' : 'grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success'}>
            {unassigned ? <UserX className="size-4.5" aria-hidden /> : <UserCheck className="size-4.5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{lecturer.fullName}</p>
            <p className="font-mono text-xs text-muted">{lecturer.staffNumber}</p>
            <p className="mt-1 text-sm">
              {unassigned
                ? <span className="text-warning">Unassigned{lecturer.reportedDepartment ? ` · SMARTTT says “${lecturer.reportedDepartment}”` : ''}</span>
                : <span className="text-ink">{lecturer.departmentName}</span>}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="sr-only" htmlFor={`place-${lecturer.userId}`}>{unassigned ? 'Place' : 'Move'} {lecturer.fullName}</label>
            <select id={`place-${lecturer.userId}`} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input min-w-0 flex-1 sm:w-56 sm:flex-none">
              <option value="">{unassigned ? 'Choose a department…' : 'Move to…'}</option>
              {choices.map((d) => <option key={d.id} value={d.id}>{d.code ? `${d.name} (${d.code})` : d.name}</option>)}
            </select>
            <Button type="button" variant="secondary" onClick={move} disabled={!departmentId} loading={pending}>{unassigned ? 'Place' : 'Move'}</Button>
          </div>
        </div>
        {learned && (
          <p role="status" className="mt-3 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
            SMARTTT’s “{learned.learnedSpelling}” now means {learned.departmentName}.
            {learned.alsoPlaced > 0 && ` ${learned.alsoPlaced} more lecturer${learned.alsoPlaced === 1 ? '' : 's'} placed.`}
          </p>
        )}
        {moveError != null && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(moveError)}</p>}
      </Card>
    </li>
  )
}

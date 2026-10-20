import { BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import type { PendingUnit } from '@/types'
import { usePendingUnits, useVerifyUnit } from './adminApi'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const meetings = (unit: PendingUnit) =>
  unit.slots.length === 0
    ? 'No timetable slot'
    : unit.slots.map((s) => `${DAYS[s.dayOfWeek]} ${s.startTime}–${s.endTime}${s.roomCode ? ` · ${s.roomCode}` : ''}`).join(', ')

/**
 * Units the timetable does not list their lecturer for. Each one stays
 * closed to class activation until an administrator confirms the lecturer is
 * allocated to teach it; the admins were emailed when it was added.
 */
export function PendingUnitsPage() {
  const units = usePendingUnits()
  const verify = useVerifyUnit()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm text-muted">
        The timetable doesn’t list these lecturers for these units. Confirm each one only once you have checked the allocation; the lecturer can then activate classes for it.
      </p>
      {verify.isError && <p role="alert" className="text-sm text-red-600">{errorMessage(verify.error)}</p>}

      {units.error ? (
        <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(units.error, 'Could not load units.')}</Card>
      ) : units.isPending ? (
        <Skeleton className="h-40" />
      ) : units.data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No units are waiting for verification.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-3">Unit</th>
                <th scope="col" className="px-5 py-3">Lecturer</th>
                <th scope="col" className="px-5 py-3">Meets</th>
                <th scope="col" className="px-5 py-3">Added</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {units.data.map((u) => (
                <tr key={u.unitId}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy-900">{u.code}</p>
                    {u.name && <p className="text-muted">{u.name}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <p>{u.lecturerName}</p>
                    <p className="text-muted">{[u.staffNumber, u.departmentName].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-5 py-3">{meetings(u)}</td>
                  <td className="whitespace-nowrap px-5 py-3">{formatShortDate(u.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      onClick={() => verify.mutate(u.unitId)}
                      loading={verify.isPending && verify.variables === u.unitId}
                      disabled={verify.isPending}
                      aria-label={`Verify ${u.code} for ${u.lecturerName}`}
                    >
                      <BadgeCheck className="size-4" aria-hidden /> Verify
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

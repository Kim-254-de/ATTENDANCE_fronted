import { BookOpen } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { useMinAttendance } from '@/lib/attendancePolicy'
import { RankedBars } from './charts'
import { useYearUnits } from './managementApi'
import { plural } from './format'
import { Breadcrumbs, Loading } from './shared'

/** Level 3: one year's units in a department, compared by attendance. Tapping a unit opens its lecturer and students. */
export function UnitsPage() {
  const { departmentId, year } = useParams<{ departmentId: string; year: string }>()
  const { data, isPending, error, refetch } = useYearUnits(departmentId, Number(year))
  const minimum = useMinAttendance()
  const base = `/management/departments/${departmentId}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Loading error={error} pending={isPending} retry={refetch} what="this year’s units">
        {() => {
          const units = [...data!.units].sort((a, b) => (b.avgAttendanceRate ?? -1) - (a.avgAttendanceRate ?? -1) || a.unitCode.localeCompare(b.unitCode))
          return (
            <>
              <div>
                <Breadcrumbs trail={[{ label: 'University', to: '/management' }, { label: data!.departmentName, to: base }, { label: `Year ${data!.year}` }]} />
                <h2 className="mt-2 text-lg font-semibold text-ink">{data!.departmentName} · Year {data!.year}</h2>
                <p className="text-sm text-muted">{plural(units.length, 'unit')}</p>
              </div>

              <Card className="p-5 sm:p-6">
                <h3 className="font-semibold text-ink">Attendance by unit</h3>
                <p className="mb-5 mt-0.5 text-sm text-muted">Average attendance per class. Tap a unit to see its lecturer and students.</p>
                {units.length === 0 ? (
                  <div className="py-10 text-center">
                    <BookOpen className="mx-auto size-8 text-muted" aria-hidden />
                    <p className="mt-3 font-semibold text-ink">No Year {data!.year} units</p>
                    <p className="mt-1 text-sm text-muted">This department teaches no units in Year {data!.year} yet.</p>
                  </div>
                ) : (
                  <RankedBars
                    label="Attendance by unit"
                    minimum={minimum}
                    items={units.map((u) => ({
                      key: u.unitId,
                      to: `${base}/years/${data!.year}/units/${u.unitId}`,
                      label: u.unitName ? `${u.unitCode} · ${u.unitName}` : u.unitCode,
                      detail: `${u.lecturerName} · ${plural(u.students.length, 'student')} · ${plural(u.sessionsHeld, 'class', 'classes')} held`,
                      rate: u.avgAttendanceRate,
                    }))}
                  />
                )}
              </Card>
            </>
          )
        }}
      </Loading>
    </div>
  )
}

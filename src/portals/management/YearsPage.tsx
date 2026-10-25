import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { useMinAttendance } from '@/lib/attendancePolicy'
import { RateColumns } from './charts'
import { useDepartmentYears } from './managementApi'
import { formatRate, plural } from './format'
import { Breadcrumbs, Loading } from './shared'

/**
 * Level 2: one department's Years 1–4 side by side. A unit's year is the
 * first digit of its code; postgraduate units (5xx and up) sit in no year
 * and are only counted. Tapping a year opens its units.
 */
export function YearsPage() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const { data, isPending, error, refetch } = useDepartmentYears(departmentId)
  const minimum = useMinAttendance()
  const base = `/management/departments/${departmentId}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Loading error={error} pending={isPending} retry={refetch} what="this department">
        {() => (
          <>
            <div>
              <Breadcrumbs trail={[{ label: 'University', to: '/management' }, { label: data!.departmentName }]} />
              <h2 className="mt-2 text-lg font-semibold text-ink">{data!.departmentName}</h2>
              {data!.departmentCode && <p className="font-mono text-sm text-muted">{data!.departmentCode}</p>}
            </div>

            <Card className="p-5 sm:p-6">
              <h3 className="font-semibold text-ink">Attendance by year of study</h3>
              <p className="mb-4 mt-0.5 text-sm text-muted">Average attendance per class. Tap a year to see its units.</p>
              <RateColumns
                label="Attendance by year of study"
                minimum={minimum}
                items={data!.years.map((y) => ({
                  key: String(y.year),
                  to: `${base}/years/${y.year}`,
                  label: `Year ${y.year}`,
                  detail: plural(y.unitCount, 'unit'),
                  rate: y.avgAttendanceRate,
                }))}
              />
              {data!.unitsWithoutYear > 0 && (
                <p className="mt-5 text-xs text-muted">
                  {plural(data!.unitsWithoutYear, 'postgraduate unit')} {data!.unitsWithoutYear === 1 ? 'belongs' : 'belong'} to no year and {data!.unitsWithoutYear === 1 ? 'is' : 'are'} not shown.
                </p>
              )}
            </Card>

            <section aria-label="Years" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {data!.years.map((y) => (
                <Link key={y.year} to={`${base}/years/${y.year}`} className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md">
                  <Card className="h-full p-5">
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold text-ink">Year {y.year}</p>
                      <p className="text-lg font-bold text-ink">{formatRate(y.avgAttendanceRate)}</p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                      <dt className="text-muted">Units</dt><dd className="text-right tabular-nums text-ink">{y.unitCount}</dd>
                      <dt className="text-muted">Students</dt><dd className="text-right tabular-nums text-ink">{y.studentCount}</dd>
                      <dt className="text-muted">Classes held</dt><dd className="text-right tabular-nums text-ink">{y.sessionsHeld}</dd>
                      <dt className="text-muted">Check-ins</dt><dd className="text-right tabular-nums text-ink">{y.checkIns}</dd>
                    </dl>
                  </Card>
                </Link>
              ))}
            </section>
          </>
        )}
      </Loading>
    </div>
  )
}

import { Building2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useMinAttendance } from '@/lib/attendancePolicy'
import { RankedBars } from './charts'
import { useUniversity } from './managementApi'
import { plural } from './format'
import { Figure, Loading } from './shared'

/**
 * Level 1: every department in the university, compared by attendance rate,
 * best first, so the ones under the exam minimum gather at the bottom.
 * Departments with no classes yet come last. Tapping one opens its years.
 */
export function DepartmentsPage() {
  const { data, isPending, error, refetch } = useUniversity()
  const minimum = useMinAttendance()
  const [search, setSearch] = useState('')

  const departments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (data?.departments ?? [])
      .filter((d) => !query || d.departmentName.toLowerCase().includes(query) || d.departmentCode?.toLowerCase().includes(query))
      .sort((a, b) => (b.avgAttendanceRate ?? -1) - (a.avgAttendanceRate ?? -1) || a.departmentName.localeCompare(b.departmentName))
  }, [data, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Loading error={error} pending={isPending} retry={refetch} what="the university’s departments">
        {() => {
          const all = data!.departments
          const below = all.filter((d) => d.avgAttendanceRate !== null && d.avgAttendanceRate < minimum).length
          return (
            <>
              <section aria-label="Key statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Figure label="Departments" value={data!.totals.departmentCount.toLocaleString()} hint={plural(all.filter((d) => d.sessionsHeld > 0).length, 'department') + ' holding classes'} />
                <Figure label="Classes held" value={data!.totals.sessionsHeld.toLocaleString()} hint="Across the university" />
                <Figure label="Check-ins" value={data!.totals.checkIns.toLocaleString()} hint="Students marked present" />
                <Figure label={`Below ${minimum}%`} value={below.toLocaleString()} hint={below === 1 ? 'Department under the exam minimum' : 'Departments under the exam minimum'} />
              </section>

              <Card className="p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-ink">Attendance by department</h2>
                    <p className="mt-0.5 text-sm text-muted">Average attendance per class. Tap a department to see its years.</p>
                  </div>
                  <label className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search department…" aria-label="Search department" className="input pl-10" />
                  </label>
                </div>
                {all.length === 0 ? (
                  <div className="py-10 text-center">
                    <Building2 className="mx-auto size-8 text-muted" aria-hidden />
                    <p className="mt-3 font-semibold text-ink">No departments yet</p>
                    <p className="mt-1 text-sm text-muted">Departments appear here once they are set up in SMARTTT.</p>
                  </div>
                ) : departments.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">No departments match your search.</p>
                ) : (
                  <RankedBars
                    label="Attendance by department"
                    minimum={minimum}
                    items={departments.map((d) => ({
                      key: d.departmentId,
                      to: `/management/departments/${d.departmentId}`,
                      label: d.departmentName,
                      detail: [d.departmentCode, plural(d.unitCount, 'unit'), plural(d.studentCount, 'student'), plural(d.checkIns, 'check-in')].filter(Boolean).join(' · '),
                      rate: d.avgAttendanceRate,
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

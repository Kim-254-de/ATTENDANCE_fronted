import { GraduationCap, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RateBar } from '@/components/attendance/RateBar'
import { Card } from '@/components/ui/Card'
import { useMinAttendance } from '@/lib/attendancePolicy'
import { initials } from '@/lib/format'
import { useYearUnits } from './managementApi'
import { formatRate, plural } from './format'
import { Breadcrumbs, Figure, Loading } from './shared'

/**
 * Level 4: one unit — who teaches it and every student taking it, with the
 * classes each attended. Read out of the year's response (useYearUnits), so
 * it opens instantly from the units chart.
 */
export function UnitPage() {
  const { departmentId, year, unitId } = useParams<{ departmentId: string; year: string; unitId: string }>()
  const { data, isPending, error, refetch } = useYearUnits(departmentId, Number(year))
  const minimum = useMinAttendance()
  const [search, setSearch] = useState('')
  const base = `/management/departments/${departmentId}`
  const unit = data?.units.find((u) => u.unitId === unitId)

  const students = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (unit?.students ?? []).filter((s) =>
      !query || s.fullName?.toLowerCase().includes(query) || s.registrationNumber?.toLowerCase().includes(query))
  }, [unit, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Loading error={error} pending={isPending} retry={refetch} what="this unit">
        {() => {
          const trail = [
            { label: 'University', to: '/management' },
            { label: data!.departmentName, to: base },
            { label: `Year ${data!.year}`, to: `${base}/years/${data!.year}` },
          ]
          if (!unit) {
            return (
              <>
                <Breadcrumbs trail={trail} />
                <Card className="p-10 text-center text-sm text-muted" role="alert">This unit is not taught in Year {data!.year} of {data!.departmentName}.</Card>
              </>
            )
          }
          const below = unit.students.filter((s) => s.attendanceRate !== null && s.attendanceRate < minimum).length
          return (
            <>
              <div>
                <Breadcrumbs trail={[...trail, { label: unit.unitCode }]} />
                <h2 className="mt-2 text-lg font-semibold text-ink">{unit.unitCode}{unit.unitName ? ` · ${unit.unitName}` : ''}</h2>
              </div>

              <section aria-label="Key statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Card className="col-span-2 flex items-center gap-4 p-5 xl:col-span-1">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white" aria-hidden>{initials(unit.lecturerName)}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm text-muted"><GraduationCap className="size-4" aria-hidden /> Lecturer</p>
                    <p className="truncate font-semibold text-ink">{unit.lecturerName}</p>
                    {unit.staffNumber && <p className="text-xs text-muted">{unit.staffNumber}</p>}
                  </div>
                </Card>
                <Figure label="Average attendance" value={formatRate(unit.avgAttendanceRate)} hint={`${plural(unit.sessionsHeld, 'class', 'classes')} held`} />
                <Figure label="Students" value={unit.students.length.toLocaleString()} hint="On the unit’s roster" />
                <Figure label={`Below ${minimum}%`} value={below.toLocaleString()} hint={below === 1 ? 'Student under the exam minimum' : 'Students under the exam minimum'} />
              </section>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
                  <h3 className="font-semibold text-ink">Students taking {unit.unitCode}</h3>
                  <label className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or reg. no…" aria-label="Search students" className="input pl-10" />
                  </label>
                </div>
                {unit.students.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="mx-auto size-8 text-muted" aria-hidden />
                    <p className="mt-3 font-semibold text-ink">No students yet</p>
                    <p className="mt-1 text-sm text-muted">Students appear once they are registered for this unit.</p>
                  </div>
                ) : students.length === 0 ? (
                  <p className="p-10 text-center text-sm text-muted">No students match your search.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                          <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                          <th scope="col" className="px-5 py-3 font-semibold">Reg. no</th>
                          <th scope="col" className="px-5 py-3 text-right font-semibold">Attended</th>
                          <th scope="col" className="px-5 py-3 font-semibold">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {students.map((s) => (
                          <tr key={s.studentUserId ?? s.registrationNumber}>
                            <td className="px-5 py-3 font-medium text-ink">{s.fullName ?? 'Not signed up yet'}</td>
                            <td className="px-5 py-3 text-muted">{s.registrationNumber ?? '—'}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-ink">{s.sessionsAttended} / {s.sessionsHeld}</td>
                            <td className="px-5 py-3"><RateBar rate={s.attendanceRate} label={`${s.fullName ?? s.registrationNumber} attendance`} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )
        }}
      </Loading>
    </div>
  )
}

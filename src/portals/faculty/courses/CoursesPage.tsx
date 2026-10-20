import { Library, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { FacultyCourse } from '@/types'
import { useFacultyCourses } from './coursesApi'

const HEADERS = ['COURSE', 'NAME', 'DEPARTMENT', 'SECTIONS']

/**
 * Every course offering across the faculty, courses still needing a
 * lecturer first — the rows a faculty officer would want to chase a
 * department about. Read-only: assigning a lecturer to a section is the
 * department's own job (its Courses page), not the faculty's.
 */
export function CoursesPage() {
  const { data: courses, isPending, error, refetch } = useFacultyCourses()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (courses ?? [])
      .filter((c) => !query
        || c.code.toLowerCase().includes(query)
        || (c.name ?? '').toLowerCase().includes(query)
        || c.departmentName.toLowerCase().includes(query))
      // Most open sections first: what still needs a department's attention leads.
      .sort((a, b) => (b.segmentsPlanned - b.segmentsFilled) - (a.segmentsPlanned - a.segmentsFilled))
  }, [courses, search])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course or department…"
            aria-label="Search course or department"
            className="input pl-10"
          />
        </label>
        <span className="text-sm text-muted">{courses ? `${rows.length} course${rows.length === 1 ? '' : 's'}` : ''}</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the faculty’s courses.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !courses ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : courses.length === 0 ? (
        <Card className="p-10 text-center">
          <Library className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No courses yet</p>
          <p className="mt-1 text-sm text-muted">Courses appear here once you provide one to a department.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No courses match your search.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                {HEADERS.map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => <CourseRow key={c.id} course={c} />)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function CourseRow({ course }: { course: FacultyCourse }) {
  const full = course.segmentsFilled >= course.segmentsPlanned
  return (
    <tr className="transition-colors hover:bg-teal-50/60">
      <td className="px-5 py-3">
        <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-100">{course.code}</span>
      </td>
      <td className="px-5 py-3 text-navy-900">{course.name ?? '—'}</td>
      <td className="px-5 py-3">
        <Link to={`/faculty-departments/${course.departmentId}`} className="text-navy-900 hover:underline">{course.departmentName}</Link>
      </td>
      <td className="px-5 py-3">
        <span className={`text-sm font-semibold ${full ? 'text-success' : 'text-orange-600'}`}>
          {course.segmentsFilled} / {course.segmentsPlanned}
        </span>
      </td>
    </tr>
  )
}

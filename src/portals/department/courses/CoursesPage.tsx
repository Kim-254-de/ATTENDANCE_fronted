import { Library, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { CourseOffering } from '@/types'
import { useDepartmentProfile } from '../dashboard/dashboardApi'
import { useAllocateLecturer, useDepartmentCourses, useLecturerDirectory, useSetSegmentCount } from './coursesApi'

/**
 * How this university fills a class, the department's half: these courses
 * have already been provided to it (manually — no ERP check); from here the
 * department decides how many lecturer-taught sections each needs and
 * assigns lecturers to them — its own, or borrowed from another department
 * (the unit stays this department's either way). Assigning is immediate — the moment it
 * happens a real unit exists and the lecturer can activate classes for it.
 */
export function CoursesPage() {
  const { data: courses, isPending, error, refetch } = useDepartmentCourses()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Set the sections each course needs, then assign a lecturer to each, from any department.</p>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load your courses.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !courses ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : courses.length === 0 ? (
        <Card className="p-10 text-center">
          <Library className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No courses yet</p>
          <p className="mt-1 text-sm text-muted">Courses appear here once one is provided to this department.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course }: { course: CourseOffering }) {
  const setSegmentCount = useSetSegmentCount()
  const allocate = useAllocateLecturer()
  const [lecturerUserId, setLecturerUserId] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(id)
  }, [search])
  const open = course.segmentsFilled < course.segmentsPlanned

  const changeSegments = (delta: number) => {
    const next = course.segmentsPlanned + delta
    if (next < 1 || next > 26 || next < course.segmentsFilled) return
    setSegmentCount.mutate({ offeringId: course.id, segmentsPlanned: next })
  }

  const assign = () => {
    if (!lecturerUserId) return
    allocate.mutate({ offeringId: course.id, lecturerUserId }, { onSuccess: () => setLecturerUserId('') })
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{course.code}</span>
          <h3 className="mt-2 font-semibold text-ink">{course.name ?? course.code}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Sections</span>
          <button
            type="button"
            onClick={() => changeSegments(-1)}
            disabled={course.segmentsPlanned <= 1 || course.segmentsPlanned <= course.segmentsFilled || setSegmentCount.isPending}
            className="grid size-7 place-items-center rounded-full border border-line text-ink transition hover:bg-surface disabled:opacity-40"
            aria-label="Fewer sections"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="w-16 text-center text-sm font-semibold text-ink">{course.segmentsFilled} / {course.segmentsPlanned}</span>
          <button
            type="button"
            onClick={() => changeSegments(1)}
            disabled={course.segmentsPlanned >= 26 || setSegmentCount.isPending}
            className="grid size-7 place-items-center rounded-full border border-line text-ink transition hover:bg-surface disabled:opacity-40"
            aria-label="More sections"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <LecturerPicker courseId={course.id} search={search} onSearchChange={setSearch} debounced={debounced} value={lecturerUserId} onChange={setLecturerUserId} />
          <Button type="button" onClick={assign} disabled={!lecturerUserId} loading={allocate.isPending}>
            Assign to next open section
          </Button>
          {allocate.error && <p role="alert" className="w-full text-sm text-danger">{errorMessage(allocate.error)}</p>}
        </div>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-sm text-success">Every section has a lecturer.</p>
      )}
    </Card>
  )
}

/**
 * Search, then choose. Own staff come first; anyone from another department is shown with it,
 * so borrowing a lecturer is a deliberate choice rather than a slip.
 */
function LecturerPicker({ courseId, search, onSearchChange, debounced, value, onChange }: {
  courseId: string
  search: string
  onSearchChange: (next: string) => void
  debounced: string
  value: string
  onChange: (next: string) => void
}) {
  const { data: lecturers, isFetching } = useLecturerDirectory(debounced)
  const departmentId = useDepartmentProfile().data?.departmentId
  const own = lecturers?.filter((l) => l.departmentId === departmentId) ?? []
  const others = lecturers?.filter((l) => l.departmentId !== departmentId) ?? []
  return (
    <>
      <label className="sr-only" htmlFor={`lecturer-search-${courseId}`}>Search lecturers</label>
      <input
        id={`lecturer-search-${courseId}`}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search lecturers…"
        className="input w-full sm:w-48"
      />
      <label className="sr-only" htmlFor={`lecturer-${courseId}`}>Lecturer for the next section</label>
      <select id={`lecturer-${courseId}`} value={value} onChange={(e) => onChange(e.target.value)} className="input w-full sm:w-auto sm:min-w-[240px]" aria-busy={isFetching || undefined}>
        <option value="">Assign a lecturer…</option>
        {own.length > 0 && (
          <optgroup label="Your department">
            {own.map((l) => <option key={l.userId} value={l.userId}>{l.fullName}</option>)}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label="Other departments">
            {others.map((l) => <option key={l.userId} value={l.userId}>{l.fullName} — {l.departmentName ?? 'unassigned'}</option>)}
          </optgroup>
        )}
      </select>
    </>
  )
}

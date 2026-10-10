import { Library, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { CourseOffering } from '@/types'
import { useDepartmentLecturers } from '../lecturers/lecturersApi'
import { useAllocateLecturer, useDepartmentCourses, useSetSegmentCount } from './coursesApi'

/**
 * How this university fills a class, the department's half: faculty has
 * already provided these courses (manually — no ERP check); from here the
 * department decides how many lecturer-taught sections each needs and
 * assigns its own lecturers to them. Assigning is immediate — the moment it
 * happens a real unit exists and the lecturer can activate classes for it.
 */
export function CoursesPage() {
  const { data: courses, isPending, error, refetch } = useDepartmentCourses()
  const { data: lecturers } = useDepartmentLecturers()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Courses your faculty has provided. Decide how many sections each needs, then assign one of your own lecturers to each.</p>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load your courses.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !courses ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : courses.length === 0 ? (
        <Card className="p-10 text-center">
          <Library className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No courses yet</p>
          <p className="mt-1 text-sm text-muted">Courses appear here once your faculty provides one to this department.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} lecturerNames={lecturers?.map((l) => ({ userId: l.userId, fullName: l.fullName })) ?? []} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course, lecturerNames }: { course: CourseOffering; lecturerNames: { userId: string; fullName: string }[] }) {
  const setSegmentCount = useSetSegmentCount()
  const allocate = useAllocateLecturer()
  const [lecturerUserId, setLecturerUserId] = useState('')
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
          <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-100">{course.code}</span>
          <h3 className="mt-2 font-semibold text-navy-900">{course.name ?? course.code}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Sections</span>
          <button
            type="button"
            onClick={() => changeSegments(-1)}
            disabled={course.segmentsPlanned <= 1 || course.segmentsPlanned <= course.segmentsFilled || setSegmentCount.isPending}
            className="grid size-7 place-items-center rounded-full border border-line text-navy-900 transition hover:bg-surface disabled:opacity-40"
            aria-label="Fewer sections"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="w-16 text-center text-sm font-semibold text-navy-900">{course.segmentsFilled} / {course.segmentsPlanned}</span>
          <button
            type="button"
            onClick={() => changeSegments(1)}
            disabled={course.segmentsPlanned >= 26 || setSegmentCount.isPending}
            className="grid size-7 place-items-center rounded-full border border-line text-navy-900 transition hover:bg-surface disabled:opacity-40"
            aria-label="More sections"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <label className="sr-only" htmlFor={`lecturer-${course.id}`}>Lecturer for the next section</label>
          <select
            id={`lecturer-${course.id}`}
            value={lecturerUserId}
            onChange={(e) => setLecturerUserId(e.target.value)}
            className="input w-auto min-w-[220px]"
          >
            <option value="">Assign a lecturer…</option>
            {lecturerNames.map((l) => <option key={l.userId} value={l.userId}>{l.fullName}</option>)}
          </select>
          <Button type="button" onClick={assign} disabled={!lecturerUserId} loading={allocate.isPending}>
            Assign to next open section
          </Button>
          {allocate.error && <p role="alert" className="w-full text-sm text-red-600">{errorMessage(allocate.error)}</p>}
        </div>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-sm text-success">Every section has a lecturer.</p>
      )}
    </Card>
  )
}

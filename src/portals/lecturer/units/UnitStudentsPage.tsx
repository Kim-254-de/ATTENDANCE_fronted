import { ArrowLeft, ScanFace, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useRemoveFaceEnrollment } from '@/portals/lecturer/attendance/faceApi'
import type { Allocation } from '@/types'
import { FaceEnrollDialog } from './FaceEnrollDialog'
import { withoutGroupNotice } from './unitCounts'
import { useMyUnits, useUnitStudents } from './unitsApi'

/**
 * Who is on one unit. The roster is read-only: the students registered for the
 * unit on the timetable system (SMARTTT), which the backend re-syncs on load —
 * a lecturer neither adds students nor approves or removes them.
 *
 * It is also where faces are registered for face check-in: a student who has
 * turned it on in their app gets a Register face button.
 */
export function UnitStudentsPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const { data: units } = useMyUnits()
  const unit = units?.find((u) => u.id === unitId)
  const ungrouped = unit ? withoutGroupNotice(unit) : null
  const { data: students, isPending, error, refetch } = useUnitStudents(unitId)
  const [enrolling, setEnrolling] = useState<(Allocation & { studentUserId: string }) | null>(null)
  const [faceNotice, setFaceNotice] = useState<string | null>(null)
  const removeFace = useRemoveFaceEnrollment(unitId)

  const faceActions: FaceActions = {
    register: (student) => { setFaceNotice(null); setEnrolling(student) },
    remove: (student) => {
      if (!window.confirm(`Remove ${student.fullName ?? 'this student'}'s registered face? They can still check in by QR code.`)) return
      removeFace.mutate(student.studentUserId, {
        onSuccess: () => setFaceNotice(`${student.fullName ?? 'The student'}'s face was removed.`),
        onError: (err) => setFaceNotice(errorMessage(err, 'Could not remove the face.')),
      })
    },
  }

  const active = students?.filter((s) => s.status === 'ACTIVE') ?? []
  const dropped = students?.filter((s) => s.status !== 'ACTIVE') ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/units" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy-900">
          <ArrowLeft className="size-4" aria-hidden /> All units
        </Link>
        <p className="mt-3 text-sm font-semibold text-orange-600">{unit?.code ?? 'UNIT'}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{unit?.name ?? unit?.code ?? 'Students'}</h2>
        {students && <p className="mt-2 text-sm text-muted">{active.length} {active.length === 1 ? 'student' : 'students'} can check in</p>}
        <p className="mt-2 text-xs text-muted">Registered for this unit on the timetable, refreshed each time you open this page. Speak to your department if someone is missing or shouldn't be here.</p>
      </div>

      {ungrouped && (
        <Card className="flex items-start gap-3 border border-orange-500/40 bg-orange-100/50 p-4" role="status">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-orange-500 text-white"><Users className="size-3.5" aria-hidden /></span>
          <p className="text-sm">
            <span className="font-semibold text-navy-900">{ungrouped}.</span>{' '}
            <span className="text-muted">They aren't on any group's list, so they can't check in until they pick their group on the timetable app.</span>
          </p>
        </Card>
      )}

      {faceNotice && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{faceNotice}</p>}

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the students on this unit.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !students ? (
        <Skeleton className="h-[200px]" />
      ) : (
        <>
          <StudentSection
            title="Students"
            students={active}
            empty="Nobody is enrolled on this unit yet."
            faceActions={faceActions}
          />
          {dropped.length > 0 && (
            <StudentSection
              title="No longer enrolled"
              hint="These students were on the unit before and cannot check in now."
              students={dropped}
            />
          )}
        </>
      )}

      {enrolling && unitId && (
        <FaceEnrollDialog
          unitId={unitId}
          student={enrolling}
          onClose={() => setEnrolling(null)}
          onDone={(message) => { setEnrolling(null); setFaceNotice(message) }}
        />
      )}
    </div>
  )
}

type FaceActions = {
  register: (student: Allocation & { studentUserId: string }) => void
  remove: (student: Allocation & { studentUserId: string }) => void
}

function StudentSection({ title, hint, empty, students, faceActions }: {
  title: string
  hint?: string
  empty?: string
  students: Allocation[]
  /** Only for students who can check in; a dropped student's face is not managed here. */
  faceActions?: FaceActions
}) {
  return (
    <section aria-label={title}>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-semibold text-navy-900">{title} <span className="font-normal text-muted">({students.length})</span></h3>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {students.length === 0 ? (
          <p className="p-5 text-sm text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {students.map((s) => <StudentRow key={s.id} student={s} faceActions={faceActions} />)}
          </ul>
        )}
      </Card>
    </section>
  )
}

function StudentRow({ student, faceActions }: { student: Allocation; faceActions?: FaceActions }) {
  const { studentUserId } = student
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{student.fullName ?? 'Unnamed student'}</span>
        <span className="text-xs text-muted">
          {student.registrationNumber && <span className="font-mono">{student.registrationNumber}</span>}
          {student.status === 'ACTIVE' && !student.hasAccount && <span> · hasn't registered yet</span>}
        </span>
      </span>
      {faceActions && studentUserId && student.hasAccount && (
        <FaceStatus student={{ ...student, studentUserId }} actions={faceActions} />
      )}
    </li>
  )
}

/**
 * A face can only be registered once the student has turned face check-in
 * on in their own app: that is their consent, and the backend enforces it.
 */
function FaceStatus({ student, actions }: { student: Allocation & { studentUserId: string }; actions: FaceActions }) {
  if (student.faceEnrolled) {
    return (
      <span className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
          <ScanFace className="size-3.5" aria-hidden /> Face registered
        </span>
        <button onClick={() => actions.register(student)} className="font-semibold text-navy-900 underline">Retake</button>
        <button onClick={() => actions.remove(student)} className="font-semibold text-red-600 underline">Remove face</button>
      </span>
    )
  }
  if (student.faceConsent) {
    return (
      <button
        onClick={() => actions.register(student)}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-surface"
      >
        <ScanFace className="size-4" aria-hidden /> Register face
      </button>
    )
  }
  return <span className="text-xs text-muted" title="The student hasn't turned on face check-in in their app">Face check-in off</span>
}

import type { TaughtUnit } from '@/types'

/**
 * The student count to show for a unit: the timetable's registered count
 * (SMARTTT) when there is one, otherwise the roster here. They differ: the
 * roster only counts students synced from the ERP.
 */
export function unitStudentCount(unit: Pick<TaughtUnit, 'registeredStudents' | 'studentCount'>) {
  if (unit.registeredStudents !== null) {
    const n = unit.registeredStudents
    return { count: n, label: `${n} registered`, title: 'Students registered for this unit on the timetable' }
  }
  const n = unit.studentCount
  return { count: n, label: `${n} ${n === 1 ? 'student' : 'students'}`, title: 'Students on this unit\'s roster' }
}

/** "40 registered students haven't picked a group yet", or null when there is nothing to say. */
export function withoutGroupNotice(unit: Pick<TaughtUnit, 'studentsWithoutGroup'>) {
  const n = unit.studentsWithoutGroup ?? 0
  if (n <= 0) return null
  return `${n} registered ${n === 1 ? "student hasn't" : "students haven't"} picked a group yet`
}

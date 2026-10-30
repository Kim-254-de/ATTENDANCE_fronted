import { HttpResponse, http, type HttpResponseResolver } from 'msw'
import type { ListedRow } from '@/portals/department/teaching/examsApi'
import type { Board, BoardLecturer, GroupInput, TeachingCourse, TeachingUnit, Term } from '@/portals/department/teaching/teachingApi'

/**
 * The department Teaching page's API (/departments/teaching/*), in memory, for
 * VITE_USE_MOCKS=true and the tests: one Generator term, one department's
 * courses, units, groups and lecturers, and publish/reopen. The real rules
 * live in the backend (src/modules/teaching); this keeps only enough of them
 * for the page to behave: missing lecturers block publishing, and a
 * published list is locked.
 */

const ok = <T>(data: T, status = 200) => HttpResponse.json({ success: true, data }, { status })
const fail = (status: number, code: string, message: string) => HttpResponse.json({ success: false, error: { code, message } }, { status })

const TERM: Term = { id: 'term-2026-1', academicYear: '2026/2027', semester: 1, name: 'September - December 2026', publishedVersion: null }
const DEPARTMENT = { id: 'dept-cs', name: 'Computer Science', code: 'DCOMP' }

const label = (c: Pick<TeachingCourse, 'programme' | 'year' | 'semester' | 'subClass'>) =>
  `${c.programme} Y${c.year}S${c.semester}${c.subClass ? ` (${c.subClass})` : ''}`
const key = (code: string, group: string) => `${code.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${group.replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'MAIN'}`

let seq = 0
const id = (prefix: string) => `${prefix}-${++seq}`

interface State {
  courses: TeachingCourse[]
  units: Array<Omit<TeachingUnit, 'courses' | 'servicing' | 'changedSincePublished' | 'groups'> & {
    courseIds: string[]
    groups: Array<{ id: string; label: string; lecturerId: string | null; lectureHours: number | null; practicalHours: number | null; cfHours: number | null; members: Array<{ courseId: string; students: number | null }> }>
  }>
  lecturers: Array<Omit<BoardLecturer, 'groups' | 'weeklyHours' | 'display'>>
  published: { by: string; at: string; reopenedAt: string | null } | null
  /** Papers saved from an uploaded exam list, sized as if from SMARTTT. */
  listed: Array<{ id: string; codes: string[]; title: string; sitting: 'regular' | 'odel'; rows: ListedRow[] }>
  /** Main invigilators named so far (no draft in the mock, so only main ones): paper id -> lecturer id. */
  invigilators: Record<string, string>
}

/** Who "synced" each unit, as SMARTTT would count them. */
const SYNCED: Record<string, Array<{ programme: string; year: number; students: number }>> = {
  'MATH 241': [{ programme: 'BSC.MATH', year: 2, students: 80 }, { programme: 'BED.SCI', year: 2, students: 12 }],
  'MATH 446': [{ programme: 'BSC.STAT', year: 4, students: 40 }],
}

function seed(): State {
  const y1 = { id: 'course-1', departmentCode: 'DCOMP', programme: 'BSC.COMP SCI', year: 1, semester: 1, subClass: '', label: 'BSC.COMP SCI Y1S1', students: 120, mode: 'regular' as const }
  return {
    courses: [y1],
    units: [{
      id: 'unit-1', code: 'COSC 103', title: 'Computer Applications', weeklyHours: 3, classLength: 2, roomType: 'lecture_hall', courseIds: [y1.id],
      groups: [{ id: 'group-1', label: '', lecturerId: null, lectureHours: null, practicalHours: null, cfHours: null, members: [{ courseId: y1.id, students: null }] }],
    }],
    lecturers: [{ id: 'tl-1', title: 'Dr.', fullName: 'Mary Wambui', staffNumber: 'STF/02291', employmentType: 'full_time', phone: '0700 000 001', email: '', maxWeeklyHours: 18, maxExamDuties: null, active: true }],
    published: null,
    listed: [],
    invigilators: {},
  }
}

let state = seed()

/** Tests only: back to the seeded department. */
export function resetTeaching() {
  state = seed()
  seq = 0
}

function board(): Board {
  const courses = new Map(state.courses.map((c) => [c.id, c]))
  const lecturers = new Map(state.lecturers.map((l) => [l.id, l]))
  const display = (l: State['lecturers'][number]) => `${l.title ? `${l.title} ` : ''}${l.fullName} (${l.employmentType === 'part_time' ? 'PT' : 'FT'})`
  const units: TeachingUnit[] = state.units.map((u) => ({
    id: u.id, code: u.code, title: u.title, weeklyHours: u.weeklyHours, classLength: u.classLength, roomType: u.roomType,
    courses: u.courseIds.map((c) => ({ id: c, label: courses.get(c)?.label ?? '?', departmentCode: 'DCOMP', students: courses.get(c)?.students ?? 0 })),
    servicing: false,
    changedSincePublished: false,
    groups: u.groups.map((g) => {
      const l = g.lecturerId ? lecturers.get(g.lecturerId) : undefined
      const members = g.members.map((m) => ({ id: m.courseId, label: courses.get(m.courseId)?.label ?? '?', departmentCode: 'DCOMP', students: courses.get(m.courseId)?.students ?? 0, givenStudents: m.students }))
      return {
        id: g.id, key: key(u.code, g.label), label: g.label, members,
        students: members.reduce((n, m) => n + (m.givenStudents ?? m.students), 0),
        lecturerId: g.lecturerId, lecturer: l ? display(l) : null,
        lectureHours: g.lectureHours, practicalHours: g.practicalHours, cfHours: g.cfHours, meetings: [],
      }
    }),
  }))
  const problems = state.units.length === 0
    ? [{ code: 'no_units', message: 'Add at least one unit.', unitId: null }]
    : units.flatMap((u) => u.groups.filter((g) => !g.lecturerId).map((g) => ({ code: 'no_lecturer', message: `${`${u.code} ${g.label}`.trim()} has no lecturer.`, unitId: u.id })))
  const standing = state.published && !state.published.reopenedAt
  const hours = (lid: string) => units.reduce((n, u) => n + u.groups.filter((g) => g.lecturerId === lid).length * u.weeklyHours, 0)
  return {
    term: TERM,
    terms: [TERM],
    department: DEPARTMENT,
    canEdit: !standing,
    published: !!standing,
    publication: state.published && {
      publishedBy: state.published.by, publishedAt: state.published.at, unitCount: units.length,
      groupCount: units.reduce((n, u) => n + u.groups.length, 0), reopenedAt: state.published.reopenedAt, reopenedBy: state.published.reopenedAt ? 'Dept Officer' : null,
    },
    courses: state.courses.map((c) => ({ ...c, usedBy: state.units.filter((u) => u.courseIds.includes(c.id)).map((u) => u.code) })),
    otherCourses: [],
    units,
    lecturers: state.lecturers.map((l) => ({ ...l, display: display(l), groups: units.reduce((n, u) => n + u.groups.filter((g) => g.lecturerId === l.id).length, 0), weeklyHours: hours(l.id) })),
    problems,
    times: { publishedVersion: null, error: null },
    summary: {
      courses: state.courses.length,
      units: units.length,
      groups: units.reduce((n, u) => n + u.groups.length, 0),
      withLecturer: units.reduce((n, u) => n + u.groups.filter((g) => g.lecturerId).length, 0),
      changed: 0,
      problems: problems.length,
    },
  }
}

const locked = () => (state.published && !state.published.reopenedAt ? fail(409, 'TEACHING_PUBLISHED', "Your department's list has been published. Reopen it before changing it.") : null)

/** `guard` is the portal's own role check (handlers.ts requireDepartment). */
export function teachingHandlers(api: string, guard: () => Response | undefined | null) {
  const base = `${api}/departments/teaching`
  const edit = (resolver: HttpResponseResolver): HttpResponseResolver => (info) => guard() ?? locked() ?? resolver(info)
  const read = (resolver: HttpResponseResolver): HttpResponseResolver => (info) => guard() ?? resolver(info)
  return [
    http.get(base, read(() => ok(board()))),
    http.get(`${base}/terms`, read(() => ok([TERM]))),

    http.post(`${base}/courses`, edit(async ({ request }) => {
      const body = (await request.json()) as Omit<TeachingCourse, 'id' | 'label' | 'departmentCode'>
      const course = { ...body, programme: body.programme.toUpperCase(), subClass: body.subClass ?? '', mode: body.mode ?? 'regular', id: id('course'), departmentCode: 'DCOMP', label: '' }
      course.label = label(course)
      if (state.courses.some((c) => c.label === course.label)) return fail(409, 'TEACHING_TAKEN', `${course.label} is already entered by your department.`)
      state.courses.push(course)
      return ok(course, 201)
    })),
    http.patch(`${base}/courses/:id`, edit(async ({ params, request }) => {
      const course = state.courses.find((c) => c.id === params.id)
      if (!course) return fail(404, 'NOT_FOUND', 'No such course.')
      Object.assign(course, (await request.json()) as object)
      course.label = label(course)
      return ok(course)
    })),
    http.delete(`${base}/courses/:id`, edit(({ params }) => {
      if (state.units.some((u) => u.courseIds.includes(String(params.id)))) return fail(409, 'TEACHING_IN_USE', 'A unit takes this course. Remove it from the unit first.')
      state.courses = state.courses.filter((c) => c.id !== params.id)
      return ok(null)
    })),

    http.post(`${base}/units`, edit(async ({ request }) => {
      const body = (await request.json()) as Omit<State['units'][number], 'id' | 'groups'>
      const unit = { ...body, code: body.code.toUpperCase(), id: id('unit'), groups: [{ id: id('group'), label: '', lecturerId: null, lectureHours: null, practicalHours: null, cfHours: null, members: body.courseIds.map((courseId) => ({ courseId, students: null })) }] }
      state.units.push(unit)
      return ok({ id: unit.id, code: unit.code }, 201)
    })),
    http.patch(`${base}/units/:id`, edit(async ({ params, request }) => {
      const unit = state.units.find((u) => u.id === params.id)
      if (!unit) return fail(404, 'NOT_FOUND', 'No such unit in your department.')
      Object.assign(unit, (await request.json()) as object)
      return ok(null)
    })),
    http.delete(`${base}/units/:id`, edit(({ params }) => {
      state.units = state.units.filter((u) => u.id !== params.id)
      return ok(null)
    })),
    http.put(`${base}/units/:id/groups`, edit(async ({ params, request }) => {
      const unit = state.units.find((u) => u.id === params.id)
      if (!unit) return fail(404, 'NOT_FOUND', 'No such unit in your department.')
      const { groups } = (await request.json()) as { groups: GroupInput[] }
      const kept = new Map(unit.groups.map((g) => [g.label, g]))
      unit.groups = groups.map((g) => {
        const name = g.label ? `GR ${g.label.replace(/^GR\s*/i, '').toUpperCase()}` : ''
        const was = kept.get(name)
        return { id: was?.id ?? id('group'), label: name, lecturerId: was?.lecturerId ?? null, lectureHours: was?.lectureHours ?? null, practicalHours: was?.practicalHours ?? null, cfHours: was?.cfHours ?? null, members: g.members }
      })
      return ok({ id: unit.id, groups: unit.groups.length })
    })),
    http.patch(`${base}/groups/:id`, edit(async ({ params, request }) => {
      const group = state.units.flatMap((u) => u.groups).find((g) => g.id === params.id)
      if (!group) return fail(404, 'NOT_FOUND', 'No such group in your department.')
      Object.assign(group, (await request.json()) as object)
      return ok(null)
    })),

    http.post(`${base}/lecturers`, read(async ({ request }) => {
      const body = (await request.json()) as Partial<State['lecturers'][number]>
      const lecturer = { title: '', staffNumber: null, employmentType: 'full_time' as const, phone: '', email: '', maxWeeklyHours: null, maxExamDuties: null, active: true, fullName: '', ...body, id: id('tl') }
      state.lecturers.push(lecturer)
      return ok({ ...lecturer, display: lecturer.fullName }, 201)
    })),
    http.patch(`${base}/lecturers/:id`, read(async ({ params, request }) => {
      const lecturer = state.lecturers.find((l) => l.id === params.id)
      if (!lecturer) return fail(404, 'NOT_FOUND', 'No such lecturer on your list.')
      Object.assign(lecturer, (await request.json()) as object)
      return ok({ ...lecturer, display: lecturer.fullName })
    })),
    http.delete(`${base}/lecturers/:id`, read(({ params }) => {
      if (state.units.some((u) => u.groups.some((g) => g.lecturerId === params.id))) return fail(409, 'TEACHING_IN_USE', 'This lecturer teaches groups. Change those first, or mark them inactive.')
      state.lecturers = state.lecturers.filter((l) => l.id !== params.id)
      return ok(null)
    })),
    // Exams: the papers board, with any papers saved from an uploaded list; no shared draft yet, so no invigilators.
    http.get(`${base}/exams`, read(() => {
      const b = board()
      const papers = state.listed.map((p) => {
        const rows = p.rows.filter((r) => r.students > 0)
        return {
          id: p.id, codes: p.codes.join('/'), sitting: p.sitting, units: [], title: p.title, examinerId: null, examiner: null, notes: '',
          classRows: rows.map((r) => `${r.programme} Y${r.year}S${r.semester}${r.stream ? ` (${r.stream})` : ''}`),
          students: rows.reduce((n, r) => n + r.students, 0), changedSincePublished: false, listed: true, rows: p.rows,
        }
      })
      return ok({
        term: TERM, department: DEPARTMENT, canEdit: true, published: false, publication: null, papers,
        units: b.units.map((u) => ({ id: u.id, code: u.code, title: u.title, noWrittenExam: false, paperId: null, paperCodes: null, paperDepartment: null, defaultExaminerId: null, sittings: ['regular'], odelPaperId: null })),
        otherUnits: [], practicals: [],
        lecturers: state.lecturers.map((l) => ({ id: l.id, display: `${l.title ? `${l.title} ` : ''}${l.fullName}`, staffNumber: l.staffNumber, active: l.active })),
        problems: b.units.map((u) => ({ code: 'unit_not_examined', message: `${u.code} is on no paper; add it to one, or mark it 'no written exam'.` })),
        warnings: papers.filter((p) => p.students === 0).map((p) => ({
          code: 'no_students',
          message: `Nobody has synced ${p.codes} in SMARTTT yet. It still goes to the Director and gets a date; enter its students under Numbers so it gets a room.`,
        })),
        summary: { papers: 0, students: 0, changed: 0, problems: b.units.length },
      })
    })),
    // No shared draft in the mock: papers aren't timetabled, but their main invigilator can be named.
    http.get(`${base}/invigilators`, read(() => {
      const display = (l: State['lecturers'][number]) => `${l.title ? `${l.title} ` : ''}${l.fullName} (FT)`
      const named = (paperId: string) => state.lecturers.find((l) => l.id === state.invigilators[paperId])
      return ok({
        term: TERM, department: DEPARTMENT, draft: null, canEdit: true, published: false, publication: null,
        papers: state.listed.map((p) => {
          const l = named(p.id)
          return {
            paperId: p.id, codes: p.codes.join('/'), title: p.title, date: null, session: null, startTime: null, endTime: null, rooms: [],
            placed: false, mainRoom: null, invigilatorId: l?.id ?? null, invigilator: l ? display(l) : null, invigilatorDepartment: l ? 'DCOMP' : null, extras: [],
          }
        }),
        lecturers: state.lecturers.filter((l) => l.active && l.staffNumber).map((l) => ({
          id: l.id, display: display(l), departmentCode: 'DCOMP', staffNumber: l.staffNumber,
          duties: Object.values(state.invigilators).filter((x) => x === l.id).length, maxExamDuties: l.maxExamDuties, own: true,
        })),
        problems: [],
      })
    })),
    http.put(`${base}/invigilators/:id`, read(async ({ params, request }) => {
      const { lecturerId, room } = (await request.json()) as { lecturerId: string | null; room?: string }
      if (room) return fail(409, 'CONFLICT', `${room} is not an extra room of this paper in the Director's shared exam draft.`)
      if (lecturerId) state.invigilators[params.id as string] = lecturerId
      else delete state.invigilators[params.id as string]
      return ok(null)
    })),
    // The uploaded exam list: any file reads as the same letter (the browser can't read .docx).
    http.post(`${base}/exam-list/read`, read(() => {
      const entry = (line: number, code: string, title: string, extra: object = {}) => {
        const rows = SYNCED[code] ?? []
        return {
          line, codes: [code], title, section: '', sitting: 'regular', students: rows.reduce((n, r) => n + r.students, 0),
          classRows: rows.map((r) => ({ label: `${r.programme} Y${r.year}S1`, students: r.students })),
          unknownCodes: [], duplicateOf: null, otherDepartments: [], existingPaperId: null, examiner: null, ...extra,
        }
      }
      return ok({
        entries: [
          entry(1, 'MATH 241', 'Linear Algebra'),
          entry(2, 'MATH 446', 'Statistical Inference II', { otherDepartments: ['DBSC'] }),
          entry(3, 'MATH 241', 'Linear Algebra', { duplicateOf: 1 }),
          entry(4, 'MATH 999', 'Not a unit', { unknownCodes: ['MATH 999'] }),
        ],
        smarttt: { available: true, reason: null },
        summary: { papers: 3, newPapers: 3, duplicates: 1, unknown: 1, noStudents: 1 },
      })
    })),
    http.post(`${base}/exam-list`, read(async ({ request }) => {
      const { papers } = (await request.json()) as { papers: Array<{ codes: string[]; title: string; sitting: 'regular' | 'odel' }> }
      for (const p of papers) {
        const rows = p.codes.flatMap((c) => SYNCED[c] ?? []).map((r) => ({
          id: id('row'), programme: r.programme, year: r.year, semester: 1, stream: '', students: r.students, smartttStudents: r.students, edited: false,
        }))
        state.listed.push({ id: id('paper'), codes: p.codes, title: p.title, sitting: p.sitting, rows })
      }
      return ok({ created: papers.length, updated: 0, smarttt: { available: true, reason: null } })
    })),
    http.patch(`${base}/exam-papers/:id`, read(async ({ params, request }) => {
      const paper = state.listed.find((p) => p.id === params.id)
      if (!paper) return fail(404, 'NOT_FOUND', 'No such paper in your department.')
      const { title, sitting } = (await request.json()) as { title?: string; sitting?: 'regular' | 'odel' }
      if (title) paper.title = title
      if (sitting) paper.sitting = sitting
      return ok(null)
    })),
    http.delete(`${base}/exam-papers/:id`, read(({ params }) => {
      state.listed = state.listed.filter((p) => p.id !== params.id)
      return ok(null)
    })),
    http.delete(`${base}/exam-list`, read(() => {
      const deleted = state.listed.length
      state.listed = []
      return ok({ deleted })
    })),
    http.put(`${base}/exam-papers/rows`, read(async ({ request }) => {
      const { papers } = (await request.json()) as { papers: Array<{ paperId: string; rows: Array<Omit<ListedRow, 'id' | 'smartttStudents' | 'edited'>> }> }
      if (papers.some((x) => !state.listed.some((p) => p.id === x.paperId))) return fail(404, 'NOT_FOUND', 'No such paper in your department.')
      for (const x of papers) {
        const paper = state.listed.find((p) => p.id === x.paperId)!
        paper.rows = x.rows.map((r) => {
          const was = paper.rows.find((y) => y.programme === r.programme && y.year === r.year && y.stream === r.stream)
          const smartttStudents = was?.smartttStudents ?? null
          return { ...r, id: was?.id ?? id('row'), smartttStudents, edited: smartttStudents === null || r.students !== smartttStudents }
        })
      }
      return ok(null)
    })),
    http.put(`${base}/exam-papers/:id/rows`, read(async ({ params, request }) => {
      const paper = state.listed.find((p) => p.id === params.id)
      if (!paper) return fail(404, 'NOT_FOUND', 'No such paper in your department.')
      const { rows } = (await request.json()) as { rows: Array<Omit<ListedRow, 'id' | 'smartttStudents' | 'edited'>> }
      paper.rows = rows.map((r) => {
        const was = paper.rows.find((x) => x.programme === r.programme && x.year === r.year && x.stream === r.stream)
        const smartttStudents = was?.smartttStudents ?? null
        return { ...r, id: was?.id ?? id('row'), smartttStudents, edited: smartttStudents === null || r.students !== smartttStudents }
      })
      return ok(null)
    })),
    http.post(`${base}/:kind/bulk`, read(() => fail(501, 'NOT_IMPLEMENTED', 'Pasting from Excel needs the real backend.'))),
    http.post(`${base}/spreadsheet`, read(() => fail(501, 'NOT_IMPLEMENTED', 'Reading a workbook needs the real backend.'))),

    http.post(`${base}/publish`, edit(() => {
      const b = board()
      if (b.problems.length) return fail(409, 'TEACHING_NOT_READY', `${b.problems.length} things must be fixed before publishing: ${b.problems[0]!.message}`)
      state.published = { by: 'Dept Officer', at: new Date().toISOString(), reopenedAt: null }
      return ok(board())
    })),
    http.post(`${base}/reopen`, read(() => {
      if (!state.published || state.published.reopenedAt) return fail(409, 'TEACHING_NOT_PUBLISHED', "Your department's list hasn't been published.")
      state.published.reopenedAt = new Date().toISOString()
      return ok(board())
    })),
  ]
}

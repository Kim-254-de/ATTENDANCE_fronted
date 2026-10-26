import { HttpResponse, http } from 'msw'
import type { ExamReport, ExamSession } from '@/portals/lecturer/exams/examsApi'

/**
 * Exam rooms (/exams/*), in memory, for VITE_USE_MOCKS=true and the tests:
 * one paper today in two rooms (the signed-in lecturer is main invigilator in
 * LH1; LH2 is someone else's) and one tomorrow. The real rules live in the
 * backend (src/modules/exam); this keeps enough for the pages to behave: a
 * room opens only in its slot, a student checks in only where they are
 * seated, and POST /attendance/check-in hands exam codes here.
 */

const ok = <T>(data: T, status = 200) => HttpResponse.json({ success: true, data }, { status })
const fail = (status: number, code: string, message: string) => HttpResponse.json({ success: false, error: { code, message } }, { status })

/** Who is signed in, as the main mock handlers know it. */
export type MockWho = () => { role: string; staffNumber?: string; registrationNumber?: string } | null

interface MockExamRoom {
  session: ExamSession
  invigilator: string
  registrationNumbers: string[]
  sat: Set<string>
}

const MINUTE = 60_000
let rooms: MockExamRoom[] = []

function seed() {
  const now = Date.now()
  const room = (paperKey: string, codes: string, room: string, role: 'main' | 'extra', invigilator: string, regs: string[], startsIn: number): MockExamRoom => ({
    session: {
      id: crypto.randomUUID(),
      paperKey,
      codes,
      title: codes === 'COSC 130' ? 'Programming' : 'Databases',
      startsAt: new Date(now + startsIn).toISOString(),
      endsAt: new Date(now + startsIn + 2 * 60 * MINUTE).toISOString(),
      room,
      role,
      candidates: regs.length,
      status: 'NOT_OPENED',
      geofence: null,
    },
    invigilator,
    registrationNumbers: regs,
    sat: new Set(),
  })
  rooms = [
    room('COSC 130', 'COSC 130', 'LH1', 'main', 'LEC00123', ['STU00042', 'STU00043'], 10 * MINUTE),
    room('COSC 130', 'COSC 130', 'LH2', 'extra', 'LEC00999', ['STU00099'], 10 * MINUTE),
    room('COSC 210', 'COSC 210', 'LH3', 'main', 'LEC00123', ['STU00042'], 24 * 60 * MINUTE),
  ]
}
seed()

export const resetExams = () => seed()

const find = (id: unknown) => rooms.find((r) => r.session.id === id)
const codeFor = (r: MockExamRoom) => `v1.${r.session.id}.1.examsig`

export function examHandlers(API: string, who: MockWho) {
  const lecturer = () => {
    const w = who()
    if (!w) return { blocked: fail(401, 'UNAUTHENTICATED', 'Not signed in') }
    if (w.role !== 'lecturer') return { blocked: fail(403, 'FORBIDDEN', 'Forbidden') }
    return { staff: w.staffNumber ?? '' }
  }
  const own = (id: unknown) => {
    const l = lecturer()
    if (l.blocked) return { blocked: l.blocked }
    const r = find(id)
    if (!r) return { blocked: fail(404, 'NOT_FOUND', 'No such exam session.') }
    if (r.invigilator !== l.staff) return { blocked: fail(403, 'FORBIDDEN', 'Only this room’s invigilator can open it.') }
    return { room: r, staff: l.staff }
  }

  const checkIn = (payload: string) => {
    const w = who()
    if (!w) return fail(401, 'UNAUTHENTICATED', 'Not signed in')
    if (w.role !== 'student') return fail(403, 'FORBIDDEN', 'Only students can check in.')
    const r = find(payload.trim().split('.')[1])!
    if (payload.trim() !== codeFor(r)) return fail(400, 'VALIDATION_FAILED', 'This is not a valid attendance code.')
    if (r.session.status !== 'OPEN') return fail(409, 'CONFLICT', 'This exam room isn’t taking check-ins.')
    const reg = w.registrationNumber ?? ''
    if (!r.registrationNumbers.includes(reg)) {
      const mine = rooms.find((o) => o.session.paperKey === r.session.paperKey && o.registrationNumbers.includes(reg))
      return mine
        ? fail(403, 'EXAM_WRONG_ROOM', `You sit ${r.session.codes} in ${mine.session.room}, not here.`)
        : fail(403, 'EXAM_NOT_CANDIDATE', `You aren’t listed for ${r.session.codes}.`)
    }
    if (r.sat.has(reg)) return fail(409, 'CONFLICT', 'Your attendance for this exam has already been recorded.')
    r.sat.add(reg)
    return ok({
      recordId: crypto.randomUUID(),
      sessionId: r.session.id,
      unitCode: r.session.codes,
      recordedAt: new Date().toISOString(),
      examSessionId: r.session.id,
      codes: r.session.codes,
      room: r.session.room,
      checkedIn: true,
    }, 201)
  }

  return [
    http.get(`${API}/exams/sessions/mine`, () => {
      const l = lecturer()
      if (l.blocked) return l.blocked
      return ok(rooms.filter((r) => r.invigilator === l.staff).map((r) => r.session))
    }),
    http.post(`${API}/exams/sessions/:id/open`, async ({ params, request }) => {
      const o = own(params.id)
      if (o.blocked) return o.blocked
      const { session } = o.room
      const now = Date.now()
      if (now < new Date(session.startsAt).getTime() - 30 * MINUTE || now > new Date(session.endsAt).getTime()) {
        return fail(403, 'FORBIDDEN', 'You can open this room from 30 minutes before the paper until it ends.')
      }
      const body = (await request.json()) as { geofence: 'ON' | 'OFF' }
      session.status = 'OPEN'
      session.geofence = body.geofence === 'OFF' ? 'OFF' : 'ROOM'
      return ok(session)
    }),
    http.get(`${API}/exams/sessions/:id/code`, ({ params }) => {
      const o = own(params.id)
      if (o.blocked) return o.blocked
      if (o.room.session.status !== 'OPEN') return fail(409, 'CONFLICT', 'Open this exam room first.')
      return ok({ session: o.room.session, payload: codeFor(o.room), expiresInSeconds: 60, rotatesAt: new Date(Date.now() + 60_000).toISOString() })
    }),
    http.post(`${API}/exams/sessions/:id/close`, ({ params }) => {
      const o = own(params.id)
      if (o.blocked) return o.blocked
      o.room.session.status = 'CLOSED'
      return ok(o.room.session)
    }),
    http.get(`${API}/exams/sessions/:id/report`, ({ params }) => {
      const l = lecturer()
      if (l.blocked) return l.blocked
      const r = find(params.id)
      if (!r) return fail(404, 'NOT_FOUND', 'No such exam session.')
      const paper = rooms.filter((o) => o.session.paperKey === r.session.paperKey)
      const isMain = paper.some((o) => o.session.role === 'main' && o.invigilator === l.staff)
      if (r.invigilator !== l.staff && !isMain) return fail(403, 'FORBIDDEN', 'Only the paper’s invigilators see its attendance.')
      const report: ExamReport = {
        paperKey: r.session.paperKey,
        codes: r.session.codes,
        title: r.session.title,
        rooms: (isMain ? paper : [r]).map((o) => ({
          room: o.session.room,
          role: o.session.role,
          sat: o.registrationNumbers.filter((n) => o.sat.has(n)),
          absent: o.registrationNumbers.filter((n) => !o.sat.has(n)),
        })),
      }
      return ok(report)
    }),
    // One scanner for classes and exams: exam codes are answered here, class codes fall through.
    http.post(`${API}/attendance/check-in`, async ({ request }) => {
      const { payload = '' } = (await request.clone().json()) as { payload?: string }
      if (!find(payload.trim().split('.')[1])) return undefined
      return checkIn(payload)
    }),
  ]
}

/** Test helper: the paper today, in the room the lecturer invigilates and the other one. */
export const mockExamRooms = () => ({ lh1: rooms[0]!, lh2: rooms[1]!, codeFor })

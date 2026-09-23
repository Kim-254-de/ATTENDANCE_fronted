import { delay, http, HttpResponse } from 'msw'
import type { CreateSessionInput, CurrentQr, Lecturer, Overview, RecentSession, SessionStatus, SessionSummary, Unit } from '@/types'

const API = '/api'
const SESSION_FLAG = 'mock-auth'
const DEFAULT_ROTATION_SECONDS = 60

const lecturer: Lecturer = {
  id: 'lec-1',
  role: 'lecturer',
  fullName: 'Dr. Joseph K. Osei',
  email: 'j.osei@university.edu',
  staffNumber: 'LEC00123',
  title: 'Dr.',
  department: 'Computer Science',
}

const units: Unit[] = [
  { id: 'u1', code: 'CS301', name: 'Data Structures & Algorithms', studentCount: 87, creditHours: 3, attendanceRate: 90 },
  { id: 'u2', code: 'CS405', name: 'Database Management Systems', studentCount: 64, creditHours: 3, attendanceRate: 95 },
  { id: 'u3', code: 'CS502', name: 'Software Engineering Principles', studentCount: 52, creditHours: 4, attendanceRate: 76 },
  { id: 'u4', code: 'CS210', name: 'Object-Oriented Programming', studentCount: 110, creditHours: 3, attendanceRate: 84 },
]

const store = (() => {
  let memory = false
  return {
    get: () => (typeof sessionStorage === 'undefined' ? memory : sessionStorage.getItem(SESSION_FLAG) === '1'),
    set: (v: boolean) => (typeof sessionStorage === 'undefined' ? (memory = v) : v ? sessionStorage.setItem(SESSION_FLAG, '1') : sessionStorage.removeItem(SESSION_FLAG)),
  }
})()

interface MockSession extends SessionSummary {
  /** Never sent to the client; only used to derive a stable-looking fake signature. */
  secret: string
  /** No student-facing scan flow exists in this mock, so check-ins are simulated: a few more "arrive" on each poll. */
  checkedIn: number
}

/** Ticks the simulated check-in count up a little, capped at the unit's roster. Never goes down. */
function simulateCheckIns(session: MockSession): number {
  const unit = units.find((u) => u.id === session.unitId)
  const capacity = unit?.studentCount ?? session.checkedIn
  if (session.status === 'OPEN' && session.checkedIn < capacity) {
    session.checkedIn = Math.min(capacity, session.checkedIn + Math.floor(Math.random() * 5))
  }
  return session.checkedIn
}

const sessions = new Map<string, MockSession>()

/** Test helper: back to a signed-out, empty server. */
export const resetMocks = () => {
  store.set(false)
  sessions.clear()
}

const ok = <T>(data: T, status = 200) => HttpResponse.json({ success: true, data }, { status })
const fail = (status: number, code: string, message: string) => HttpResponse.json({ success: false, error: { code, message } }, { status })
const unauthorized = () => fail(401, 'UNAUTHENTICATED', 'Not signed in')

/** Mimics the real HMAC-rotation shape closely enough for local UI work, without real crypto. */
function currentToken(session: MockSession, at = Date.now()) {
  const counter = Math.floor(at / 1000 / session.rotationSeconds)
  const windowStartMs = counter * session.rotationSeconds * 1000
  const rotatesAtMs = windowStartMs + session.rotationSeconds * 1000
  const signature = `${session.secret}.${counter}`.split('').reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 0).toString(36)
  return {
    payload: `v1.${session.id}.${counter}.${signature}`,
    expiresInSeconds: Math.max(1, Math.ceil((rotatesAtMs - at) / 1000)),
    rotatesAt: new Date(rotatesAtMs).toISOString(),
  }
}

function assertAcceptingScans(session: MockSession) {
  const now = new Date()
  if (session.status === 'CLOSED') return fail(409, 'CONFLICT', 'This class session has been closed.')
  if (session.status === 'PAUSED') return fail(409, 'CONFLICT', 'This class session is paused.')
  if (now < new Date(session.opensAt)) return fail(409, 'CONFLICT', 'This class session has not started yet.')
  if (now > new Date(session.closesAt)) return fail(409, 'CONFLICT', 'This class session has ended.')
  return null
}

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { identifier, password } = (await request.json()) as { identifier: string; password: string }
    await delay(300)
    const valid = [lecturer.email, lecturer.staffNumber].includes(identifier) && password === 'password'
    if (!valid) return fail(401, 'INVALID_CREDENTIALS', 'Invalid staff number/email or password')
    store.set(true)
    return ok(lecturer)
  }),
  http.post(`${API}/auth/logout`, () => {
    store.set(false)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/auth/me`, () => (store.get() ? ok(lecturer) : unauthorized())),

  http.get(`${API}/lecturer/overview`, async () => {
    if (!store.get()) return unauthorized()
    await delay(200)
    const overview: Overview = {
      totalStudents: units.reduce((n, u) => n + u.studentCount, 0),
      unitsTaught: units.length,
      avgAttendance: 86.4,
      sessionsHeld: 38,
      periodLabel: 'Sep 2026',
      erpSync: { status: 'synced', lastSyncedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
    }
    return ok(overview)
  }),
  http.get(`${API}/lecturer/units`, () => (store.get() ? ok(units) : unauthorized())),

  http.get(`${API}/lecturer/sessions/recent`, async () => {
    if (!store.get()) return unauthorized()
    await delay(200)
    const recent: RecentSession[] = [
      { id: 's1', date: '2026-09-07T08:00:00Z', unitCode: 'CS301', present: 78, total: 87, reference: 'QR-CS301-0908' },
      { id: 's2', date: '2026-09-07T11:00:00Z', unitCode: 'CS405', present: 61, total: 64, reference: 'QR-CS405-0908' },
      { id: 's3', date: '2026-09-04T09:00:00Z', unitCode: 'CS502', present: 47, total: 52, reference: 'QR-CS502-0905' },
    ]
    return ok(recent)
  }),

  http.post(`${API}/sessions`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as CreateSessionInput
    await delay(300)
    const unit = units.find((u) => u.id === input.unitId)
    if (!unit) return fail(404, 'NOT_FOUND', 'Unit not found')
    const closesAt = new Date(input.closesAt)
    if (!(closesAt.getTime() > Date.now())) return fail(400, 'VALIDATION_FAILED', 'The session must close after it opens.')

    const session: MockSession = {
      id: crypto.randomUUID(),
      unitId: unit.id,
      unitCode: unit.code,
      unitName: unit.name,
      title: input.title ?? null,
      status: 'OPEN',
      opensAt: new Date().toISOString(),
      closesAt: closesAt.toISOString(),
      rotationSeconds: input.rotationSeconds ?? DEFAULT_ROTATION_SECONDS,
      secret: crypto.randomUUID(),
      checkedIn: 0,
    }
    sessions.set(session.id, session)
    const { secret: _secret, checkedIn: _checkedIn, ...summary } = session
    return ok(summary, 201)
  }),

  http.get(`${API}/sessions/:id/qr`, ({ params }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    const blocked = assertAcceptingScans(session)
    if (blocked) return blocked

    const { payload, expiresInSeconds, rotatesAt } = currentToken(session)
    const checkedIn = simulateCheckIns(session)
    const { secret: _secret, checkedIn: _checkedIn, ...summary } = session
    const body: CurrentQr = { session: summary, payload, expiresInSeconds, rotatesAt, checkedIn }
    return ok(body)
  }),

  http.patch(`${API}/sessions/:id/status`, async ({ params, request }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    const { status } = (await request.json()) as { status: SessionStatus }
    if (session.status === 'CLOSED' && status !== 'CLOSED') {
      return fail(409, 'CONFLICT', 'A closed session cannot be reopened. Create a new session instead.')
    }
    session.status = status
    sessions.set(session.id, session)
    const { secret: _secret, checkedIn: _checkedIn, ...summary } = session
    return ok(summary)
  }),
]

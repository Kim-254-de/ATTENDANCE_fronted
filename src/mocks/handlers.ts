import { delay, http, HttpResponse } from 'msw'
import type { Allocation, CreateSessionInput, CreateUnitInput, CurrentQr, Lecturer, Overview, RecentSession, SessionAttendance, SessionStatus, SessionSummary, TaughtUnit, Unit, UnitSchedule } from '@/types'

// Mocks follow the same base URL as the client, so the two can never disagree.
const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
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
  status: 'ACTIVE',
  avatarUrl: null,
}

const student: Lecturer = {
  id: 'stu-1',
  role: 'student',
  fullName: 'Ama Mensah',
  email: 'a.mensah@student.university.edu',
  staffNumber: 'STU00042',
  title: '',
  department: 'BSc Computer Science',
  status: 'ACTIVE',
  avatarUrl: null,
}

const accounts = new Map<string, { user: Lecturer; password: string }>([
  [lecturer.staffNumber.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.staffNumber.toLowerCase(), { user: student, password: 'password' }],
  [lecturer.email.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.email.toLowerCase(), { user: student, password: 'password' }],
])

const units: Unit[] = [
  { id: 'u1', code: 'CS301', name: 'Data Structures & Algorithms', studentCount: 87, creditHours: 3, attendanceRate: 90 },
  { id: 'u2', code: 'CS405', name: 'Database Management Systems', studentCount: 64, creditHours: 3, attendanceRate: 95 },
  { id: 'u3', code: 'CS502', name: 'Software Engineering Principles', studentCount: 52, creditHours: 4, attendanceRate: 76 },
  { id: 'u4', code: 'CS210', name: 'Object-Oriented Programming', studentCount: 110, creditHours: 3, attendanceRate: 84 },
]

/** Units added during a test are dropped again by resetMocks. */
const BASE_UNIT_COUNT = units.length

/**
 * Every unit's issued weekly slot, keyed by unit id. The base units span
 * today's whole day so the demo (and tests) always finds a "current" class
 * regardless of when it runs, rather than being flaky around real wall-clock time.
 */
const ALWAYS_TODAY: UnitSchedule = { dayOfWeek: new Date().getDay(), startTime: '00:00', endTime: '23:59' }
const schedules = new Map<string, UnitSchedule>(units.map((u) => [u.id, ALWAYS_TODAY]))

/**
 * A lecturer-added unit needs admin verification before it can activate a
 * class (mirrors unit.repository.ts / session.service.ts). Kept parallel to
 * `units`, the same way `schedules` is, rather than on `Unit` itself — the
 * seeded units start VERIFIED so the demo has something to activate.
 */
const unitStatuses = new Map<string, 'PENDING_VERIFICATION' | 'VERIFIED'>(units.map((u) => [u.id, 'VERIFIED']))

const store = (() => {
  let memory = false
  return {
    // VITE_USE_MOCKS=data: sign-in, units, sessions and check-ins are real (handled by the
    // backend); only the dashboard data below is mocked, so it trusts the real session instead of the mock login flag.
    get: () => import.meta.env.VITE_USE_MOCKS === 'data' || (typeof sessionStorage === 'undefined' ? memory : sessionStorage.getItem(SESSION_FLAG) === '1'),
    set: (v: boolean) => (typeof sessionStorage === 'undefined' ? (memory = v) : v ? sessionStorage.setItem(SESSION_FLAG, '1') : sessionStorage.removeItem(SESSION_FLAG)),
  }
})()

let currentAccount: Lecturer = lecturer


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

/** Test helper: back to a signed-out server with only the seeded units and their rosters. */
export const resetMocks = () => {
  store.set(false)
  currentAccount = lecturer
  sessions.clear()
  for (const u of units.slice(BASE_UNIT_COUNT)) { schedules.delete(u.id); unitStatuses.delete(u.id); allocations.delete(u.id) }
  units.length = BASE_UNIT_COUNT
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

const authHandlers = [
  http.post(`${API}/auth/register`, async ({ request }) => {
    const input = (await request.json()) as { email: string; fullName: string; staffNumber: string; password: string; role?: string }
    await delay(450)
    const identifier = input.staffNumber.trim().toLowerCase()
    const email = input.email.trim().toLowerCase()
    if (!input.email || !input.fullName || !input.staffNumber || input.password.length < 8) {
      return HttpResponse.json({ message: 'Complete all required fields.' }, { status: 422 })
    }
    if (accounts.has(identifier) || accounts.has(email)) {
      return HttpResponse.json({ message: 'That email or ID is already registered.' }, { status: 409 })
    }
    const account: Lecturer = {
      id: `${input.role ?? 'lecturer'}-${crypto.randomUUID()}`,
      role: input.role === 'student' ? 'student' : 'lecturer',
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      staffNumber: input.staffNumber.trim(),
      title: input.role === 'student' ? '' : 'Lecturer',
      department: input.role === 'student' ? 'Programme pending' : 'Department pending',
      status: 'ACTIVE',
      avatarUrl: null,
    }
    accounts.set(identifier, { user: account, password: input.password })
    accounts.set(email, { user: account, password: input.password })
    return HttpResponse.json({ message: `${input.role === 'student' ? 'Student' : 'Lecturer'} account request submitted.` }, { status: 201 })
  }),
  http.post(`${API}/auth/forgot-password`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string }
    await delay(450)
    if (!email) return HttpResponse.json({ message: 'Enter your school email.' }, { status: 422 })
    return HttpResponse.json({ message: 'If an account exists, reset instructions are on the way.' })
  }),
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { identifier, password } = (await request.json()) as { identifier: string; password: string }
    await delay(300)
    const accountRecord = accounts.get(identifier.trim().toLowerCase())
    const account = accountRecord?.user
    const ok = Boolean(accountRecord) && accountRecord?.password === password
    if (!ok) return HttpResponse.json({ message: 'Invalid staff number/email or password' }, { status: 401 })
    store.set(true)
    currentAccount = account as Lecturer
    return HttpResponse.json(account)
  }),
  http.post(`${API}/auth/logout`, () => {
    store.set(false)
    currentAccount = lecturer
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/auth/me`, () => (store.get() ? HttpResponse.json(currentAccount) : unauthorized())),
  // Name and email are excluded on purpose — those are ERP-verified at registration; see
  // updateProfileSchema on the real backend.
  http.patch(`${API}/auth/me`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as { title?: string; department?: string }
    if (!input.department?.trim()) {
      return HttpResponse.json({ message: 'Enter your department.' }, { status: 422 })
    }
    Object.assign(currentAccount, {
      title: input.title?.trim() ?? '',
      department: input.department.trim(),
    })
    return HttpResponse.json(currentAccount)
  }),
  http.post(`${API}/auth/me/avatar`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const { avatarDataUrl } = (await request.json()) as { avatarDataUrl?: string }
    currentAccount.avatarUrl = avatarDataUrl ?? null
    return HttpResponse.json({ avatarUrl: currentAccount.avatarUrl })
  }),
  http.delete(`${API}/auth/me/avatar`, () => {
    if (!store.get()) return unauthorized()
    currentAccount.avatarUrl = null
    return HttpResponse.json({ avatarUrl: null })
  }),
  http.post(`${API}/auth/change-password`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as { currentPassword?: string; newPassword?: string }
    const record = [...accounts.values()].find((a) => a.user === currentAccount)
    if (!record || input.currentPassword !== record.password) {
      return HttpResponse.json({ message: 'Your current password is incorrect.' }, { status: 400 })
    }
    if (input.newPassword) record.password = input.newPassword
    return HttpResponse.json({ message: 'Your password has been changed. You have been signed out on every other device.' })
  }),
  // Mock sessions never expire, so there is never anything to refresh.
  http.post(`${API}/auth/refresh`, unauthorized),

  // Stand-in for the ERP gate: only staff numbers starting with STF/ "exist".
  http.post(`${API}/auth/lecturer/register`, async ({ request }) => {
    const input = (await request.json()) as { fullName: string; email: string; staffNumber: string }
    await delay(300)
    const staffNumber = input.staffNumber.trim().toUpperCase()
    if (!staffNumber.startsWith('STF/')) {
      return HttpResponse.json(
        { message: 'Registration was not completed. This staff number is not listed in the institutional staff records.', code: 'ERP_STAFF_NOT_FOUND' },
        { status: 403 },
      )
    }
    return HttpResponse.json(
      {
        id: crypto.randomUUID(), fullName: input.fullName, email: input.email.trim().toLowerCase(), staffNumber,
        status: 'PENDING_VERIFICATION', nextStep: 'VERIFY_EMAIL',
        message: 'Your staff number was verified successfully. Check your email to confirm your address.',
      },
      { status: 201 },
    )
  }),
  http.post(`${API}/auth/verify-email`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    return token === 'expired'
      ? HttpResponse.json({ message: 'This verification link is invalid or has expired.', code: 'INVALID_TOKEN' }, { status: 400 })
      : HttpResponse.json({ status: 'PENDING_APPROVAL', nextStep: 'AWAIT_APPROVAL', message: 'Email confirmed. An administrator will review and approve your account.' })
  }),
]

/**
 * `/lecturers/overview` is real now (see lecturer.routes.ts on the backend) —
 * deliberately NOT in dataHandlers, so VITE_USE_MOCKS=data lets the request
 * through to the real backend instead of shadowing it. Only registered for
 * full VITE_USE_MOCKS=true demo/test mode, where there is no backend at all.
 */
const overviewHandler = http.get(`${API}/lecturers/overview`, async () => {
  if (!store.get()) return unauthorized()
  await delay(200)
  const overview: Overview = {
    totalStudents: units.reduce((n, u) => n + u.studentCount, 0),
    unitsTaught: units.length,
    avgAttendance: 86.4,
    sessionsHeld: 38,
    periodLabel: 'All time',
  }
  return ok(overview)
})

/**
 * `/reports/sessions` is real now (see reporting.routes.ts on the backend) —
 * deliberately NOT in dataHandlers, same reasoning as overviewHandler above.
 */
const recentSessionsHandler = http.get(`${API}/reports/sessions`, async ({ request }) => {
  if (!store.get()) return unauthorized()
  await delay(200)
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? '5')
  const recent: RecentSession[] = [
    { id: 's1', date: '2026-09-07T08:00:00Z', unitId: 'u1', unitCode: 'CS301', unitName: 'Data Structures & Algorithms', present: 78, absent: 9, total: 87, rate: 90, reference: 'QR-CS301-0908' },
    { id: 's2', date: '2026-09-07T11:00:00Z', unitId: 'u2', unitCode: 'CS405', unitName: 'Database Management Systems', present: 61, absent: 3, total: 64, rate: 95, reference: 'QR-CS405-0908' },
    { id: 's3', date: '2026-09-04T09:00:00Z', unitId: 'u3', unitCode: 'CS502', unitName: 'Software Engineering Principles', present: 47, absent: 5, total: 52, rate: 90, reference: 'QR-CS502-0905' },
  ]
  return ok(recent.slice(0, limit))
})

export const dataHandlers = [
  http.get(`${API}/lecturer/units`, () => (store.get() ? ok(units) : unauthorized())),
]

/**
 * Students on each mock unit, standing in for what the backend syncs from the
 * ERP's enrolment records. The roster sizes in `units` are just headline
 * numbers; these are the rows the roster page actually lists.
 */
const mockRoster = (names: Array<[reg: string, fullName: string, hasAccount: boolean]>): Allocation[] =>
  names.map(([registrationNumber, fullName, hasAccount]) => ({
    id: crypto.randomUUID(),
    registrationNumber,
    studentUserId: hasAccount ? crypto.randomUUID() : null,
    fullName,
    status: 'ACTIVE' as const,
    source: 'ERP' as const,
    hasAccount,
    createdAt: '2026-09-01T08:00:00Z',
  }))

const allocations = new Map<string, Allocation[]>([
  ['u1', mockRoster([
    ['SC211/0001/2022', 'Amina Wanjiku Kamau', true],
    ['SC211/0002/2022', 'Brian Otieno Odhiambo', true],
    ['SC211/0006/2021', 'Felix Kiprono Rotich', false],
  ])],
  ['u2', mockRoster([
    ['SC211/0003/2023', 'Cynthia Achieng Ouma', true],
    ['SC211/0004/2023', 'David Mwangi Njoroge', false],
  ])],
])

const taughtUnit = (u: Unit): TaughtUnit => {
  const list = allocations.get(u.id) ?? []
  return {
    id: u.id,
    code: u.code,
    name: u.name,
    studentCount: u.studentCount + list.filter((a) => a.status === 'ACTIVE').length,
    pendingCount: list.filter((a) => a.status === 'PENDING').length,
    createdAt: '2026-09-01T08:00:00Z',
    schedule: schedules.get(u.id) ?? null,
    status: unitStatuses.get(u.id) ?? 'VERIFIED',
  }
}

/** Whether `now` falls inside a unit's issued slot — mirrors session.service.ts's resolveClosesAt. */
function isWithinSchedule(schedule: UnitSchedule, now = new Date()): boolean {
  if (schedule.dayOfWeek !== now.getDay()) return false
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return hhmm >= schedule.startTime && hhmm <= schedule.endTime
}

/** Today's Date at the given "HH:MM" time. */
function atTimeOfDay(hhmm: string, now = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const result = new Date(now)
  result.setHours(h ?? 0, m ?? 0, 0, 0)
  return result
}

/**
 * Units, allocations, sessions, QR codes and check-ins. Mocked only when VITE_USE_MOCKS=true;
 * in `data` mode these requests go to the real backend.
 */
export const liveHandlers = [
  http.get(`${API}/units`, () => (store.get() ? ok(units.map(taughtUnit)) : unauthorized())),

  /** The unit ActivateClass may open a session for right now, per its issued schedule — VERIFIED units only. */
  http.get(`${API}/units/current`, () => {
    if (!store.get()) return unauthorized()
    const unit = units.find((u) => {
      const schedule = schedules.get(u.id)
      return unitStatuses.get(u.id) === 'VERIFIED' && schedule && isWithinSchedule(schedule)
    })
    return ok(unit ? taughtUnit(unit) : null)
  }),

  /**
   * A lecturer only sends a code; the name/schedule stand in for what the
   * real backend pulls from the ERP's issued timetable. This mock timetable
   * never lists the demo lecturer as any course's assigned staff, so — same
   * as the real ERP-mismatch case — a newly added unit always lands
   * PENDING_VERIFICATION rather than auto-verifying.
   */
  http.post(`${API}/units`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as CreateUnitInput
    const code = input.code.trim().replace(/\s+/g, ' ').toUpperCase()
    if (units.some((u) => u.code === code)) return fail(409, 'CONFLICT', `You have already added ${code}.`)
    const unit: Unit = { id: crypto.randomUUID(), code, name: `${code} Course`, studentCount: 0, creditHours: 3, attendanceRate: 0 }
    units.push(unit)
    schedules.set(unit.id, ALWAYS_TODAY)
    unitStatuses.set(unit.id, 'PENDING_VERIFICATION')
    return ok(taughtUnit(unit), 201)
  }),

  /** The roster, as the backend would return it after syncing from the ERP — read-only. */
  http.get(`${API}/units/:unitId/students`, ({ params }) => {
    if (!store.get()) return unauthorized()
    if (!units.some((u) => u.id === params.unitId)) return fail(404, 'NOT_FOUND', 'Unit not found.')
    return ok(allocations.get(params.unitId as string) ?? [])
  }),

  http.get(`${API}/attendance/sessions/:id`, ({ params }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    const attendees: SessionAttendance['attendees'] = Array.from({ length: session.checkedIn }, (_, i) => ({
      id: `${session.id}-${i}`,
      studentUserId: `stu-${i}`,
      fullName: `Student ${String(session.checkedIn - i).padStart(3, '0')}`,
      registrationNumber: null,
      recordedAt: new Date(Date.now() - i * 20_000).toISOString(),
    }))
    return ok({ sessionId: session.id, checkedIn: session.checkedIn, attendees })
  }),

  http.post(`${API}/sessions`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as CreateSessionInput
    await delay(300)
    const unit = units.find((u) => u.id === input.unitId)
    if (!unit) return fail(404, 'NOT_FOUND', 'Unit not found')

    // Mirrors session.service.ts's resolveClosesAt: a unit with an issued
    // schedule gets closesAt derived from the slot's end time, ignoring any
    // client-supplied value; only a legacy unschedule unit falls back to it.
    const schedule = schedules.get(unit.id)
    let closesAt: Date
    if (schedule) {
      if (!isWithinSchedule(schedule)) {
        return fail(403, 'FORBIDDEN', `You can only activate this class during its scheduled time (${schedule.startTime}–${schedule.endTime}).`)
      }
      closesAt = atTimeOfDay(schedule.endTime)
    } else {
      if (!input.closesAt) return fail(400, 'VALIDATION_FAILED', 'This unit has no issued schedule; closesAt is required.')
      closesAt = new Date(input.closesAt)
      if (!(closesAt.getTime() > Date.now())) return fail(400, 'VALIDATION_FAILED', 'The session must close after it opens.')
    }

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
    const enrolled = units.find((u) => u.id === session.unitId)?.studentCount ?? 0
    const body: CurrentQr = { session: summary, payload, expiresInSeconds, rotatesAt, checkedIn, enrolled }
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

export const handlers = [...authHandlers, overviewHandler, recentSessionsHandler, ...dataHandlers, ...liveHandlers]

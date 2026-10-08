import { delay, http, HttpResponse } from 'msw'
import type { Account, Allocation, AttendanceMark, CheckInResult, FaceCheckInResult, FaceIdentifyResult, FaceStatus, CreateSessionInput, CreateUnitInput, CurrentQr, GeofenceStatus, Lecturer, LecturerStudent, Overview, RecentSession, SessionAttendance, SessionStatus, SessionSummary, Student, StudentAttendance, StudentAttendanceRecord, StudentRegistrationInput, StudentRegistrationResult, StudentUnit, TaughtUnit, Unit, UnitSchedule, VerificationMethod } from '@/types'

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

const student: Student = {
  id: 'stu-1',
  role: 'student',
  fullName: 'Ama Mensah',
  email: 'a.mensah@student.university.edu',
  registrationNumber: 'STU00042',
  programme: 'BSc Computer Science',
  yearOfStudy: 3,
  status: 'ACTIVE',
  avatarUrl: null,
}

const accounts = new Map<string, { user: Account; password: string }>([
  [lecturer.staffNumber.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.registrationNumber.toLowerCase(), { user: student, password: 'password' }],
  [lecturer.email.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.email.toLowerCase(), { user: student, password: 'password' }],
])

/** The seeded accounts; accounts registered during a test are removed by resetMocks. */
const BASE_ACCOUNT_KEYS = new Set(accounts.keys())

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
/** The seeded units stand in for ones synced from the timetable (SMARTTT): they carry its registered count. A unit added by code has none. */
const timetableCounts = new Map<string, number>(units.map((u) => [u.id, u.studentCount]))
/** One seeded unit stands in for a group of a split unit, with registered students still to pick a group. */
const timetableGroups = new Map<string, { baseCode: string; group: string; withoutGroup: number }>([
  ['u2', { baseCode: 'CS405', group: 'GR A', withoutGroup: 12 }],
])

const store = (() => {
  let memory = false
  return {
    // VITE_USE_MOCKS=data: sign-in, units, sessions and check-ins are real (handled by the
    // backend); only the dashboard data below is mocked, so it trusts the real session instead of the mock login flag.
    get: () => import.meta.env.VITE_USE_MOCKS === 'data' || (typeof sessionStorage === 'undefined' ? memory : sessionStorage.getItem(SESSION_FLAG) === '1'),
    set: (v: boolean) => (typeof sessionStorage === 'undefined' ? (memory = v) : v ? sessionStorage.setItem(SESSION_FLAG, '1') : sessionStorage.removeItem(SESSION_FLAG)),
  }
})()

let currentAccount: Account = lecturer


interface MockSession extends SessionSummary {
  /** Never sent to the client; only used to derive a stable-looking fake signature. */
  secret: string
  /** Simulated arrivals (a few more on each poll) plus real mock check-ins from /attendance/check-in. */
  checkedIn: number
  /** Students who checked in through POST /attendance/check-in — one each, like the backend's unique index. */
  checkedInStudents: Set<string>
  /** Real mock check-ins (QR or face), oldest first, for the attendee list. */
  records: Array<{ studentUserId: string; fullName: string; registrationNumber: string | null; verificationMethod: VerificationMethod; recordedAt: string }>
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

/** Mock classes are in a surveyed room, so they never wait for the lecturer's phone. */
const mockFence = (): GeofenceStatus => ({ mode: 'ROOM', radiusMetres: 20, roomCode: 'LH1', anchorAccuracyMetres: 4, hasCentre: true })

/** Test helper: back to a signed-out server with only the seeded units and their rosters. */
export const resetMocks = () => {
  store.set(false)
  currentAccount = lecturer
  sessions.clear()
  for (const key of [...accounts.keys()]) if (!BASE_ACCOUNT_KEYS.has(key)) accounts.delete(key)
  for (const u of units.slice(BASE_UNIT_COUNT)) { schedules.delete(u.id); unitStatuses.delete(u.id); allocations.delete(u.id); timetableCounts.delete(u.id) }
  units.length = BASE_UNIT_COUNT
  resetFaceMocks()
}

const ok = <T>(data: T, status = 200) => HttpResponse.json({ success: true, data }, { status })
const fail = (status: number, code: string, message: string) => HttpResponse.json({ success: false, error: { code, message } }, { status })
const unauthorized = () => fail(401, 'UNAUTHENTICATED', 'Not signed in')

/** A stable-looking fake signature for one rotation window. Not crypto — the real backend uses HMAC-SHA256. */
const mockSignature = (session: MockSession, counter: number) =>
  `${session.secret}.${counter}`.split('').reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 0).toString(36)

const rotationCounter = (session: MockSession, at = Date.now()) => Math.floor(at / 1000 / session.rotationSeconds)

/** Mimics the real HMAC-rotation shape closely enough for local UI work, without real crypto. */
function currentToken(session: MockSession, at = Date.now()) {
  const counter = rotationCounter(session, at)
  const windowStartMs = counter * session.rotationSeconds * 1000
  const rotatesAtMs = windowStartMs + session.rotationSeconds * 1000
  const signature = mockSignature(session, counter)
  return {
    payload: `v1.${session.id}.${counter}.${signature}`,
    expiresInSeconds: Math.max(1, Math.ceil((rotatesAtMs - at) / 1000)),
    rotatesAt: new Date(rotatesAtMs).toISOString(),
  }
}

/** What the client may see of a session: never its secret or check-in bookkeeping. */
function toSummary(session: MockSession): SessionSummary {
  const { secret: _secret, checkedIn: _checkedIn, checkedInStudents: _students, records: _records, ...summary } = session
  return summary
}

/** The backend's QR messages (src/modules/session/session.token.ts VERIFICATION_MESSAGES). */
const INVALID_CODE = 'This QR code is not a valid attendance code.'
const EXPIRED_CODE = 'This QR code has expired. Please scan the code currently on screen.'
const FUTURE_CODE = 'This QR code is not valid yet. Check your device clock and scan the code on screen.'

/** Units the mock student is on. */
const STUDENT_UNIT_IDS = ['u1', 'u2']

/** Past classes for the mock student: attended all but one. */
const PAST_CLASSES: { unitId: string; daysAgo: number; present: boolean; title: string }[] = [
  { unitId: 'u1', daysAgo: 7, present: true, title: 'Week 3 - Lecture' },
  { unitId: 'u2', daysAgo: 6, present: false, title: 'Week 3 - Lab' },
  { unitId: 'u1', daysAgo: 14, present: true, title: 'Week 2 - Lecture' },
]

/** The mock student's classes, newest first: the seeded past ones plus any live mock sessions. */
function mockStudentHistory(studentId: string): StudentAttendanceRecord[] {
  const live = [...sessions.values()].filter((se) => STUDENT_UNIT_IDS.includes(se.unitId)).map((se): StudentAttendanceRecord => {
    const present = se.checkedInStudents.has(studentId)
    const open = se.status !== 'CLOSED' && new Date(se.closesAt) > new Date()
    const mark: AttendanceMark = present ? 'PRESENT' : open ? 'OPEN' : 'ABSENT'
    return {
      sessionId: se.id, unitId: se.unitId, unitCode: se.unitCode, unitName: se.unitName, title: se.title,
      opensAt: se.opensAt, closesAt: se.closesAt, mark, recordedAt: present ? new Date().toISOString() : null,
    }
  })
  const past = PAST_CLASSES.map((c, i): StudentAttendanceRecord => {
    const unit = units.find((u) => u.id === c.unitId)!
    const opensAt = new Date(Date.now() - c.daysAgo * 86_400_000)
    return {
      sessionId: `past-${i}`, unitId: c.unitId, unitCode: unit.code, unitName: unit.name, title: c.title,
      opensAt: opensAt.toISOString(), closesAt: new Date(opensAt.getTime() + 2 * 3_600_000).toISOString(),
      mark: c.present ? 'PRESENT' : 'ABSENT', recordedAt: c.present ? opensAt.toISOString() : null,
    }
  })
  return [...live, ...past].sort((a, b) => b.opensAt.localeCompare(a.opensAt))
}

/**
 * Test and demo helper: opens a live session for a seeded unit and returns
 * the code a student would scan now, plus one from two windows ago (expired).
 */
export function openMockSessionForScan(unitId = 'u1') {
  const unit = units.find((u) => u.id === unitId) ?? units[0]!
  const session: MockSession = {
    id: crypto.randomUUID(),
    unitId: unit.id,
    unitCode: unit.code,
    unitName: unit.name,
    title: null,
    status: 'OPEN',
    opensAt: new Date(Date.now() - 60_000).toISOString(),
    closesAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    rotationSeconds: DEFAULT_ROTATION_SECONDS,
    geofence: mockFence(),
    secret: crypto.randomUUID(),
    checkedIn: 0,
    checkedInStudents: new Set(),
    records: [],
  }
  sessions.set(session.id, session)
  const expiredCounter = rotationCounter(session) - 2
  return {
    session,
    payload: currentToken(session).payload,
    expiredPayload: `v1.${session.id}.${expiredCounter}.${mockSignature(session, expiredCounter)}`,
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
  // Stand-in for the student records check: registration numbers starting with EBT1/ or STU "exist",
  // except EBT1/99999/23. Real mode: POST /auth/student/register checks SMARTTT (or the ERP).
  http.post(`${API}/auth/student/register`, async ({ request }) => {
    const input = (await request.json()) as StudentRegistrationInput
    await delay(300)
    const registrationNumber = input.registrationNumber.trim().toUpperCase()
    const email = input.email.trim().toLowerCase()
    if (!/^(EBT1\/|STU)/.test(registrationNumber) || registrationNumber === 'EBT1/99999/23') {
      return fail(403, 'STUDENT_RECORD_NOT_FOUND', 'Registration was not completed. This registration number is not in the student records. Check it, or contact the registrar.')
    }
    if (accounts.has(registrationNumber.toLowerCase()) || accounts.has(email)) {
      return fail(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already exists for these details. Try signing in, or reset your password.')
    }
    // No emailed link and no approval: the account can sign in straight away.
    const account: Student = {
      id: `student-${crypto.randomUUID()}`, role: 'student', fullName: input.fullName.trim(), email,
      registrationNumber, programme: 'BSc Computer Science', yearOfStudy: 1, status: 'ACTIVE', avatarUrl: null,
    }
    accounts.set(registrationNumber.toLowerCase(), { user: account, password: input.password })
    accounts.set(email, { user: account, password: input.password })
    const result: StudentRegistrationResult = {
      id: account.id, fullName: account.fullName, email, registrationNumber, status: 'ACTIVE',
      nextStep: 'SIGN_IN', createdAt: new Date().toISOString(),
      message: 'Your registration number was verified and your account is ready. You can now sign in.',
    }
    return ok(result, 201)
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
    currentAccount = account as Account
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
    if (currentAccount.role !== 'lecturer') return fail(403, 'FORBIDDEN', 'Forbidden')
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
    const input = (await request.json()) as { fullName: string; email: string; staffNumber: string; password: string }
    await delay(300)
    const staffNumber = input.staffNumber.trim().toUpperCase()
    const email = input.email.trim().toLowerCase()
    if (!staffNumber.startsWith('STF/')) {
      return HttpResponse.json(
        { message: 'Registration was not completed. This staff number is not listed in the institutional staff records.', code: 'ERP_STAFF_NOT_FOUND' },
        { status: 403 },
      )
    }
    if (accounts.has(staffNumber.toLowerCase()) || accounts.has(email)) {
      return HttpResponse.json(
        { message: 'An account already exists for these details. Try signing in, or reset your password.', code: 'ACCOUNT_ALREADY_EXISTS' },
        { status: 409 },
      )
    }

    const account: Lecturer = {
      id: crypto.randomUUID(),
      role: 'lecturer',
      fullName: input.fullName.trim(),
      email,
      staffNumber,
      title: '',
      department: '',
      status: 'ACTIVE',
      avatarUrl: null,
    }

    accounts.set(staffNumber.toLowerCase(), { user: account, password: input.password })
    accounts.set(email, { user: account, password: input.password })

    return HttpResponse.json(
      {
        id: account.id,
        fullName: account.fullName,
        email: account.email,
        staffNumber: account.staffNumber,
        status: 'ACTIVE',
        nextStep: 'SIGN_IN',
        message: 'Your staff number was verified and your account is ready. You can now sign in.',
      },
      { status: 201 },
    )
  }),
  http.post(`${API}/auth/verify-email`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    return token === 'expired'
      ? HttpResponse.json({ message: 'This verification link is invalid or has expired.', code: 'INVALID_TOKEN' }, { status: 400 })
      : HttpResponse.json({ status: 'ACTIVE', nextStep: 'SIGN_IN', message: 'Email confirmed. You can now sign in.' })
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
 * `/lecturers/students` is real now (see lecturer.routes.ts on the backend) — deliberately NOT
 * in dataHandlers, same reasoning as overviewHandler above. Attendance rates are fixed demo
 * numbers (this mock doesn't track per-student check-ins the way the seeded `sessions` Map
 * does), chosen to show a mix of Active and At Risk standing like the real page would.
 */
const DEMO_STUDENT_RATES = [94, 87, 72, 91, 65, 98, 83]
const studentsHandler = http.get(`${API}/lecturers/students`, async () => {
  if (!store.get()) return unauthorized()
  await delay(200)
  let i = 0
  const rows: LecturerStudent[] = [...allocations.entries()].flatMap(([unitId, roster]) => {
    const unit = units.find((u) => u.id === unitId)
    if (!unit) return []
    return roster.map((a): LecturerStudent => {
      const rate = DEMO_STUDENT_RATES[i++ % DEMO_STUDENT_RATES.length]!
      return {
        id: a.id,
        registrationNumber: a.registrationNumber,
        studentUserId: a.studentUserId,
        fullName: a.fullName,
        unitId,
        unitCode: unit.code,
        unitName: unit.name,
        sessionsHeld: 20,
        sessionsAttended: Math.round((rate / 100) * 20),
        attendanceRate: rate,
      }
    })
  })
  return ok(rows)
})

/**
 * Students on each mock unit, standing in for what the backend syncs from the
 * ERP's enrolment records. The roster sizes in `units` are just headline
 * numbers; these are the rows the roster page actually lists.
 */
/** A seeded student's face check-in: turned on in their app (`consented`), and registered by a lecturer (`enrolled`). */
type SeedFace = 'enrolled' | 'consented' | 'off'

const mockRoster = (names: Array<[reg: string, fullName: string, hasAccount: boolean, face?: SeedFace]>): Allocation[] =>
  names.map(([registrationNumber, fullName, hasAccount, face = 'off']) => ({
    id: crypto.randomUUID(),
    registrationNumber,
    studentUserId: hasAccount ? crypto.randomUUID() : null,
    fullName,
    status: 'ACTIVE' as const,
    source: 'SMARTTT' as const,
    hasAccount,
    faceConsent: face !== 'off',
    faceEnrolled: face === 'enrolled',
    createdAt: '2026-09-01T08:00:00Z',
  }))

const allocations = new Map<string, Allocation[]>([
  ['u1', mockRoster([
    ['SC211/0001/2022', 'Amina Wanjiku Kamau', true, 'enrolled'],
    ['SC211/0002/2022', 'Brian Otieno Odhiambo', true, 'consented'],
    ['SC211/0006/2021', 'Felix Kiprono Rotich', false],
  ])],
  ['u2', mockRoster([
    ['SC211/0003/2023', 'Cynthia Achieng Ouma', true],
    ['SC211/0004/2023', 'David Mwangi Njoroge', false],
  ])],
])

/** The seeded face state, so tests that register or remove a face don't leak into the next. */
const SEED_FACES = new Map([...allocations.values()].flat().map((a) => [a.id, { faceConsent: a.faceConsent, faceEnrolled: a.faceEnrolled }]))

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
    baseCode: timetableGroups.get(u.id)?.baseCode ?? (timetableCounts.has(u.id) ? u.code : null),
    group: timetableGroups.get(u.id)?.group ?? null,
    registeredStudents: timetableCounts.get(u.id) ?? null,
    studentsWithoutGroup: timetableGroups.get(u.id)?.withoutGroup ?? null,
    timetableSyncedAt: timetableCounts.has(u.id) ? '2026-09-01T08:00:00Z' : null,
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
    const real: SessionAttendance['attendees'] = [...session.records].reverse().map((r, i) => ({ id: `${session.id}-r${i}`, ...r }))
    const simulated: SessionAttendance['attendees'] = Array.from({ length: Math.max(0, session.checkedIn - real.length) }, (_, i) => ({
      id: `${session.id}-${i}`,
      studentUserId: `stu-${i}`,
      fullName: `Student ${String(session.checkedIn - real.length - i).padStart(3, '0')}`,
      registrationNumber: null,
      recordedAt: new Date(Date.now() - (i + 1) * 20_000).toISOString(),
      verificationMethod: 'QR' as const,
    }))
    const attendees = [...real, ...simulated]
    return ok({ sessionId: session.id, checkedIn: session.checkedIn, attendees })
  }),

  http.post(`${API}/sessions`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as CreateSessionInput
    await delay(300)
    const unit = units.find((u) => u.id === input.unitId)
    if (!unit) return fail(404, 'NOT_FOUND', 'Unit not found')
    const existingSession = [...sessions.values()].find((session) =>
      session.unitId === unit.id && session.status !== 'CLOSED' && new Date(session.closesAt).getTime() > Date.now(),
    )
    if (existingSession) return fail(409, 'CONFLICT', 'A class session is already in progress for this unit.')

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
      geofence: mockFence(),
      secret: crypto.randomUUID(),
      checkedIn: 0,
      checkedInStudents: new Set(),
      records: [],
    }
    sessions.set(session.id, session)
    const summary = toSummary(session)
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
    const summary = toSummary(session)
    const enrolled = units.find((u) => u.id === session.unitId)?.studentCount ?? 0
    const body: CurrentQr = { session: summary, payload, expiresInSeconds, rotatesAt, checkedIn, enrolled }
    return ok(body)
  }),

  /**
   * Student check-in, mirroring the backend's order of checks (session.service.ts
   * verifyScan): a well-formed signed code, from the current or previous window,
   * for a session accepting scans, once per student. The mock skips the roster
   * check: its student is on every unit.
   */
  http.post(`${API}/attendance/check-in`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Only students can check in.')
    const { payload = '', location } = (await request.json()) as { payload?: string; location?: { accuracy: number; capturedAt: number } }
    const [version, sessionId = '', counterText = '', signature = ''] = payload.trim().split('.')
    const session = sessions.get(sessionId)
    const counter = Number(counterText)
    if (version !== 'v1' || !session || !Number.isInteger(counter) || signature !== mockSignature(session, counter)) {
      return fail(400, 'VALIDATION_FAILED', INVALID_CODE)
    }
    const now = rotationCounter(session)
    if (counter > now) return fail(410, 'VALIDATION_FAILED', FUTURE_CODE)
    if (counter < now - 1) return fail(410, 'VALIDATION_FAILED', EXPIRED_CODE)
    const blocked = assertAcceptingScans(session)
    if (blocked) return blocked
    // Mirrors session.geofence.ts checkReading, short of the distance: the mock has no room to measure from.
    if (session.geofence.mode !== 'OFF') {
      if (!location) return fail(422, 'LOCATION_REQUIRED', 'This class checks where you are. Allow location access and scan again.')
      if (Math.abs(Date.now() - location.capturedAt) > 60_000) return fail(422, 'LOCATION_STALE', 'Your location reading is out of date. Scan again.')
      if (location.accuracy > 50) {
        return fail(422, 'LOCATION_TOO_IMPRECISE', `Your location is only accurate to about ${Math.round(location.accuracy)} m. Turn on precise location and scan again.`)
      }
    }
    if (session.checkedInStudents.has(currentAccount.id)) {
      return fail(409, 'CONFLICT', 'Your attendance for this class has already been recorded.')
    }
    session.checkedInStudents.add(currentAccount.id)
    session.checkedIn += 1
    session.records.push({ studentUserId: currentAccount.id, fullName: currentAccount.fullName, registrationNumber: currentAccount.registrationNumber, verificationMethod: 'QR', recordedAt: new Date().toISOString() })
    const result: CheckInResult = {
      recordId: crypto.randomUUID(),
      sessionId: session.id,
      unitCode: session.unitCode,
      recordedAt: new Date().toISOString(),
    }
    return ok(result, 201)
  }),

  // The mock student is on the first two seeded units, with a few past classes recorded.
  http.get(`${API}/students/me/units`, () => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
    const studentId = currentAccount.id
    const result: StudentUnit[] = STUDENT_UNIT_IDS.map((id) => {
      const unit = units.find((u) => u.id === id)!
      const history = mockStudentHistory(studentId).filter((r) => r.unitId === id && r.mark !== 'OPEN')
      const attended = history.filter((r) => r.mark === 'PRESENT').length
      return {
        id, code: unit.code, name: unit.name, baseCode: unit.code, group: null, lecturerName: lecturer.fullName,
        schedule: schedules.get(id) ?? null, sessionsHeld: history.length, sessionsAttended: attended,
        attendanceRate: history.length ? Math.round((attended / history.length) * 1000) / 10 : null,
        onRoster: true, groupRequired: false,
      }
    })
    // Registered for on the timetable app, but its lecturer hasn't set it up here yet.
    result.push({
      id: null, code: 'CS410', name: 'Distributed Systems', baseCode: 'CS410', group: null, lecturerName: 'Dr. Mary Wambui',
      schedule: null, sessionsHeld: 0, sessionsAttended: 0, attendanceRate: null, onRoster: false, groupRequired: false,
    })
    return ok(result)
  }),

  http.get(`${API}/students/me/attendance`, ({ request }) => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50)
    const records = mockStudentHistory(currentAccount.id).slice(0, limit)
    const counted = records.filter((r) => r.mark !== 'OPEN')
    const attended = counted.filter((r) => r.mark === 'PRESENT').length
    const body: StudentAttendance = {
      summary: { sessionsHeld: counted.length, attended, attendanceRate: counted.length ? Math.round((attended / counted.length) * 1000) / 10 : null },
      records,
    }
    return ok(body)
  }),

  http.get(`${API}/sessions/live`, () => {
    if (!store.get()) return unauthorized()
    const live = [...sessions.values()].filter((se) => se.status !== 'CLOSED' && new Date(se.closesAt).getTime() > Date.now())
    return ok(live.map(toSummary))
  }),

  /** Mirrors session.service.ts setSessionGeofence: a surveyed room's point always wins. */
  http.patch(`${API}/sessions/:id/geofence`, async ({ params, request }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    if (session.status === 'CLOSED') return fail(409, 'CONFLICT', 'This class session has been closed.')
    const input = (await request.json()) as { mode: 'ON' | 'OFF'; location?: { accuracy: number } }
    if (input.mode === 'OFF') {
      session.geofence = { ...session.geofence, mode: 'OFF' }
    } else if (session.geofence.roomCode && session.geofence.anchorAccuracyMetres !== null && session.geofence.mode !== 'AWAITING_LOCATION') {
      session.geofence = { ...session.geofence, mode: 'ROOM' }
    } else if (!input.location || input.location.accuracy > 30) {
      return fail(422, 'GEOFENCE_ANCHOR_UNAVAILABLE', 'Your device\'s location is not precise enough. Try again from a phone.')
    } else {
      session.geofence = { ...session.geofence, mode: 'LECTURER_DEVICE', radiusMetres: 20, anchorAccuracyMetres: input.location.accuracy, hasCentre: true }
    }
    return ok(toSummary(session))
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
    const summary = toSummary(session)
    return ok(summary)
  }),
]

// --- Face check-in (backend: src/modules/verification) -----------------------

/** The mock student's own face check-in. */
let studentFace: { consentedAt: string | null; enrolledAt: string | null } = { consentedAt: null, enrolledAt: null }
/** Matches the terminal has shown, by token, until confirmed. */
const faceMatches = new Map<string, { sessionId: string; allocation: Allocation; score: number; expiresAt: number }>()
const FACE_MATCH_TTL_MS = 60_000

function resetFaceMocks() {
  studentFace = { consentedAt: null, enrolledAt: null }
  faceMatches.clear()
  for (const a of [...allocations.values()].flat()) Object.assign(a, SEED_FACES.get(a.id))
}

const faceStatus = (): FaceStatus => ({
  consentGiven: studentFace.consentedAt !== null,
  consentedAt: studentFace.consentedAt,
  enrolled: studentFace.enrolledAt !== null,
  enrolledAt: studentFace.enrolledAt,
})

/**
 * What the mock "sees" in a photo. Tests send `face:<full name>` (or `face:none`,
 * `face:nobody`, `face:twins`) as the image's base64 content; a real camera
 * frame from the demo decodes to something else, and is treated as `face:any`.
 */
function seenInPhoto(image: string): string {
  try {
    const text = atob(image.split(',')[1] ?? image)
    return text.startsWith('face:') ? text.slice(5) : 'any'
  } catch {
    return 'any'
  }
}

const NO_FACE = 'No face found. Hold the phone at eye level, about an arm\'s length from the student.'

export const faceHandlers = [
  http.get(`${API}/students/me/face`, () => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
    return ok(faceStatus())
  }),

  http.put(`${API}/students/me/face-consent`, () => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
    studentFace.consentedAt ??= new Date().toISOString()
    return ok(faceStatus())
  }),

  /** Withdrawing deletes the registered face, as on the backend. */
  http.delete(`${API}/students/me/face-consent`, () => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
    studentFace = { consentedAt: null, enrolledAt: null }
    return ok(faceStatus())
  }),

  http.post(`${API}/units/:unitId/students/:studentUserId/face`, async ({ params, request }) => {
    if (!store.get()) return unauthorized()
    const allocation = allocations.get(params.unitId as string)?.find((a) => a.studentUserId === params.studentUserId)
    if (!allocation) return fail(404, 'NOT_FOUND', 'This student is not on the unit.')
    if (!allocation.faceConsent) {
      return fail(409, 'FACE_CONSENT_REQUIRED', `${allocation.fullName} has not turned on face check-in in their app yet. Ask them to, then try again.`)
    }
    const { images = [] } = (await request.json()) as { images?: string[] }
    if (images.length !== 3) return fail(400, 'VALIDATION_FAILED', 'Take 3 photos.')
    await delay(300)
    const blank = images.findIndex((image) => seenInPhoto(image) === 'none')
    if (blank >= 0) return HttpResponse.json({ success: false, error: { code: 'FACE_NOT_FOUND', message: NO_FACE, details: { photo: blank + 1 } } }, { status: 422 })
    const replaced = allocation.faceEnrolled
    allocation.faceEnrolled = true
    return ok({ studentUserId: allocation.studentUserId, enrolledAt: new Date().toISOString(), replaced }, 201)
  }),

  http.delete(`${API}/units/:unitId/students/:studentUserId/face`, ({ params }) => {
    if (!store.get()) return unauthorized()
    const allocation = allocations.get(params.unitId as string)?.find((a) => a.studentUserId === params.studentUserId)
    if (!allocation) return fail(404, 'NOT_FOUND', 'This student is not on the unit.')
    const removed = allocation.faceEnrolled
    allocation.faceEnrolled = false
    return ok({ removed })
  }),

  /** Mirrors verification.service.ts identifyFace: only the unit's enrolled students can match, and nothing is recorded. */
  http.post(`${API}/sessions/:id/face/identify`, async ({ params, request }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    const blocked = assertAcceptingScans(session)
    if (blocked) return blocked
    const { image = '' } = (await request.json()) as { image?: string }
    await delay(250)
    const seen = seenInPhoto(image)
    if (seen === 'none') return fail(422, 'FACE_NOT_FOUND', NO_FACE)

    const enrolled = (allocations.get(session.unitId) ?? []).filter((a) => a.status === 'ACTIVE' && a.faceConsent && a.faceEnrolled && a.studentUserId)
    const counts = { facesInFrame: 1, enrolledOnUnit: enrolled.length }
    if (seen === 'twins') return ok<FaceIdentifyResult>({ result: 'AMBIGUOUS', ...counts })
    const allocation = seen === 'any'
      ? enrolled.find((a) => !session.checkedInStudents.has(a.studentUserId!))
      : enrolled.find((a) => a.fullName === seen)
    if (!allocation) return ok<FaceIdentifyResult>({ result: 'NO_MATCH', ...counts })

    const alreadyCheckedIn = session.checkedInStudents.has(allocation.studentUserId!)
    const expiresAt = Date.now() + FACE_MATCH_TTL_MS
    const matchToken = alreadyCheckedIn ? null : `mock-match.${crypto.randomUUID()}`
    if (matchToken) faceMatches.set(matchToken, { sessionId: session.id, allocation, score: 0.87, expiresAt })
    return ok<FaceIdentifyResult>({
      result: 'MATCH',
      student: { studentUserId: allocation.studentUserId!, fullName: allocation.fullName ?? '', registrationNumber: allocation.registrationNumber, avatarDataUrl: null },
      score: 0.87,
      alreadyCheckedIn,
      matchToken,
      expiresAt: matchToken ? new Date(expiresAt).toISOString() : null,
      ...counts,
    })
  }),

  /** Mirrors verification.service.ts confirmFace: only a current match on this session, and once per student. */
  http.post(`${API}/sessions/:id/face/confirm`, async ({ params, request }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    const blocked = assertAcceptingScans(session)
    if (blocked) return blocked
    const { matchToken = '' } = (await request.json()) as { matchToken?: string }
    const match = faceMatches.get(matchToken)
    if (!match || match.sessionId !== session.id) return fail(400, 'VALIDATION_FAILED', 'Not a valid match. Photograph the student again.')
    if (Date.now() > match.expiresAt) return fail(410, 'FACE_MATCH_EXPIRED', 'That match has expired. Photograph the student again.')
    const { allocation } = match
    const studentUserId = allocation.studentUserId!
    if (session.checkedInStudents.has(studentUserId)) return fail(409, 'CONFLICT', 'Your attendance for this class has already been recorded.')
    session.checkedInStudents.add(studentUserId)
    session.checkedIn += 1
    const recordedAt = new Date().toISOString()
    session.records.push({ studentUserId, fullName: allocation.fullName ?? '', registrationNumber: allocation.registrationNumber, verificationMethod: 'FACE', recordedAt })
    return ok<FaceCheckInResult>({ recordId: crypto.randomUUID(), sessionId: session.id, unitCode: session.unitCode, studentUserId, fullName: allocation.fullName ?? '', recordedAt }, 201)
  }),
]

export const handlers = [...authHandlers, overviewHandler, recentSessionsHandler, studentsHandler, ...dataHandlers, ...liveHandlers, ...faceHandlers]

import { delay, http, HttpResponse } from 'msw'
import type { EnrolmentStudent, Terminal, TerminalCapability } from '@/portals/department/terminals/terminalsApi'
import { resetTeaching, teachingHandlers } from './teaching'
import type { Account, Admin, Allocation, AttendanceMark, CheckInResult, DepartmentLecturer, DepartmentOfficer, DepartmentOverview, DepartmentProfile, DepartmentTimekeepingEntry, DepartmentUnit, FaceCheckInResult, FaceIdentifyResult, FaceStatus, InvitationDetails, Officer, CreateSessionInput, CreateUnitInput, CurrentQr, GeofenceStatus, Lecturer, LecturerStudent, Overview, QaAttendanceTrendPoint, QaAudit, QaAuditStatus, QaChecklistItem, QaChecklistTemplate, QaCorrectiveAction, QaCapaStatus, QaDirectoryEntry, QaFindingRating, QaOfficer, QaStandard, RecentSession, SessionAttendance, SessionStatus, SessionSummary, Student, StudentAttendance, StudentAttendanceRecord, StudentUnit, TaughtUnit, Unit, UnitSchedule, VerificationMethod, AdminDepartment, DepartmentAlias, DuplicateDepartment, PlacementResult, AttendancePolicy, EligibilityReport, EligibilityRow, EligibilityStatus, EvaluationQuestion, EvaluationQuestionResult, EvaluationResults, EvaluationRound, EvaluationRoundDetail, EvaluationRoundInput, EvaluationRoundStatus, EvaluationUnitResult, PlacementLecturer, StudentEvaluationRound, PendingUnit, ManagementAccount, ManagementDepartment, ManagementDepartmentYears, ManagementStudent, ManagementUnit, ManagementUniversity, ManagementYearDetail } from '@/types'

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

/** Department accounts are provisioned, never self-registered, so email is the only identifier they sign in with. */
const departmentOfficer: DepartmentOfficer = {
  id: 'dep-1',
  role: 'department',
  fullName: 'Prof. Grace N. Mutiso',
  email: 'g.mutiso@university.edu',
  departmentId: 'dept-cs',
  departmentName: 'Computer Science',
  status: 'ACTIVE',
  avatarUrl: null,
}

/** Administrators are invited too; this one stands in for the first, made with `npm run admin:invite`. */
const adminUser: Admin = {
  id: 'adm-1',
  role: 'admin',
  fullName: 'Ms. Aisha Njeri',
  email: 'admin@university.edu',
  status: 'ACTIVE',
  avatarUrl: null,
}

/** Management accounts are invited the same way department ones are; university-wide, so no scope. */
const managementAccount: ManagementAccount = {
  id: 'mgmt-1',
  role: 'management',
  fullName: 'Prof. Daniel K. Rotich',
  email: 'd.rotich@university.edu',
  status: 'ACTIVE',
  avatarUrl: null,
}

/** QA accounts are provisioned too: no department of its own, so nothing org-unit-scoped to resolve here. */
const qaOfficer: QaOfficer = {
  id: 'qa-1',
  role: 'qa',
  fullName: 'Ms. Susan Achieng',
  email: 's.achieng@university.edu',
  title: 'QA Officer',
  status: 'ACTIVE',
  avatarUrl: null,
}

const accounts = new Map<string, { user: Account; password: string }>([
  [lecturer.staffNumber.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.registrationNumber.toLowerCase(), { user: student, password: 'password' }],
  [lecturer.email.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.email.toLowerCase(), { user: student, password: 'password' }],
  [departmentOfficer.email.toLowerCase(), { user: departmentOfficer, password: 'password' }],
  [managementAccount.email.toLowerCase(), { user: managementAccount, password: 'password' }],
  [adminUser.email.toLowerCase(), { user: adminUser, password: 'password' }],
  [qaOfficer.email.toLowerCase(), { user: qaOfficer, password: 'password' }],
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

/**
 * Accounts deleted during a test (DELETE /auth/me, or by an officer). Kept as
 * a set rather than removed from the seed data, so resetMocks brings them back.
 */
const deletedUserIds = new Set<string>()
const isDeleted = (userId: string | null) => userId !== null && deletedUserIds.has(userId)


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
  for (const key of BASE_ACCOUNT_KEYS) accounts.get(key)!.password = 'password' // undo a test's change-password
  for (const u of units.slice(BASE_UNIT_COUNT)) { schedules.delete(u.id); unitStatuses.delete(u.id); allocations.delete(u.id); timetableCounts.delete(u.id) }
  units.length = BASE_UNIT_COUNT
  deletedUserIds.clear()
  resetFaceMocks()
  resetOfficerMocks()
  resetQaMocks()
  resetTerminalMocks()
  resetOversightMocks()
  resetTeaching()
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
    const ok = Boolean(accountRecord) && accountRecord?.password === password && !isDeleted(account?.id ?? null)
    if (!ok) return HttpResponse.json({ message: 'Invalid staff number/email or password' }, { status: 401 })
    if (officers.find((o) => o.userId === account?.id)?.status === 'DEACTIVATED') {
      return fail(403, 'ACCOUNT_NOT_ACTIVE', 'This account has been deactivated. Please contact the administrator.')
    }
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
  // Anonymised on the real backend (auth.deletion.ts); here the account just stops signing in.
  http.delete(`${API}/auth/me`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    if (currentAccount.role !== 'lecturer' && currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
    const { password } = (await request.json()) as { password?: string }
    const record = [...accounts.values()].find((a) => a.user === currentAccount)
    if (record?.password !== password) return fail(400, 'BAD_REQUEST', 'Your password is incorrect.')
    deletedUserIds.add(currentAccount.id)
    store.set(false)
    currentAccount = lecturer
    return new HttpResponse(null, { status: 204 })
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

/** What VITE_USE_MOCKS=data still mocks: nothing, now that the backend serves every endpoint the portals call. */
export const dataHandlers = []

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
/** The first photo of each registration made in the mock, by allocation id. Seeded registrations have none, like ones made before the backend kept them. */
const referencePhotos = new Map<string, string>()

function resetFaceMocks() {
  studentFace = { consentedAt: null, enrolledAt: null }
  faceMatches.clear()
  referencePhotos.clear()
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
  http.post(`${API}/face/warm-up`, () => {
    if (!store.get()) return unauthorized()
    return ok({ enabled: true }, 202)
  }),
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
    referencePhotos.set(allocation.id, images[0]!)
    return ok({ studentUserId: allocation.studentUserId, enrolledAt: new Date().toISOString(), replaced }, 201)
  }),

  http.delete(`${API}/units/:unitId/students/:studentUserId/face`, ({ params }) => {
    if (!store.get()) return unauthorized()
    const allocation = allocations.get(params.unitId as string)?.find((a) => a.studentUserId === params.studentUserId)
    if (!allocation) return fail(404, 'NOT_FOUND', 'This student is not on the unit.')
    const removed = allocation.faceEnrolled
    allocation.faceEnrolled = false
    referencePhotos.delete(allocation.id)
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
      student: { studentUserId: allocation.studentUserId!, fullName: allocation.fullName ?? '', registrationNumber: allocation.registrationNumber, avatarDataUrl: null, referencePhotoDataUrl: referencePhotos.get(allocation.id) ?? null },
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

/* ------------------------------------------------------------------ *
 * Department portal (GET /departments/*)
 *
 * One officer oversees a whole department, so these rows are wider than
 * the lecturer portal's: three lecturers, the units they teach, and the
 * timekeeping log behind the on-time rates. All read-only.
 * ------------------------------------------------------------------ */

/** The seeded lecturer is one of the three, so the lecturer and department portals never disagree about them. */
const DEPARTMENT_LECTURERS: DepartmentLecturer[] = [
  { userId: lecturer.id, fullName: lecturer.fullName, staffNumber: lecturer.staffNumber, isOwnStaff: true, homeDepartmentName: 'Computer Science', unitsTaught: 2, unitsElsewhere: 0, studentsTaught: 151, avgAttendanceRate: 92.5, sessionsHeld: 38, avgLateMinutes: 1.2, onTimeRate: 94.7 },
  { userId: 'lec-2', fullName: 'Dr. Mary Wambui', staffNumber: 'STF/02291', isOwnStaff: true, homeDepartmentName: 'Computer Science', unitsTaught: 2, unitsElsewhere: 1, studentsTaught: 93, avgAttendanceRate: 76, sessionsHeld: 22, avgLateMinutes: 8.4, onTimeRate: 63.6 },
  { userId: 'lec-3', fullName: 'Mr. Peter Njuguna', staffNumber: 'STF/03480', isOwnStaff: true, homeDepartmentName: 'Computer Science', unitsTaught: 1, unitsElsewhere: 0, studentsTaught: 110, avgAttendanceRate: 68, sessionsHeld: 14, avgLateMinutes: 17.9, onTimeRate: 42.9 },
]

/** Every unit in the department — a superset of `units` (the seeded lecturer's own), plus two colleagues'. */
const DEPARTMENT_UNITS: (DepartmentUnit & { lecturerUserId: string; sessionsHeld: number })[] = [
  { id: 'u1', code: 'CS301', name: 'Data Structures & Algorithms', lecturerName: lecturer.fullName, lecturerUserId: lecturer.id, studentCount: 87, attendanceRate: 90, sessionsHeld: 20 },
  { id: 'u2', code: 'CS405', name: 'Database Management Systems', lecturerName: lecturer.fullName, lecturerUserId: lecturer.id, studentCount: 64, attendanceRate: 95, sessionsHeld: 18 },
  { id: 'u3', code: 'CS502', name: 'Software Engineering Principles', lecturerName: 'Dr. Mary Wambui', lecturerUserId: 'lec-2', studentCount: 52, attendanceRate: 76, sessionsHeld: 14 },
  { id: 'u4', code: 'CS210', name: 'Object-Oriented Programming', lecturerName: 'Mr. Peter Njuguna', lecturerUserId: 'lec-3', studentCount: 110, attendanceRate: 68, sessionsHeld: 14 },
  // Timetabled but never activated yet, so it has no rate to show — the null-rate case the tables must handle.
  { id: 'u5', code: 'CS410', name: 'Distributed Systems', lecturerName: 'Dr. Mary Wambui', lecturerUserId: 'lec-2', studentCount: 41, attendanceRate: null, sessionsHeld: 0 },
]

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000)

/**
 * The timekeeping log: scheduled start against when the class was actually
 * opened. A deliberate mix — early, on time, a few minutes late, and badly
 * late — so each colour band on the Timekeeping table is exercised.
 */
const DEPARTMENT_TIMEKEEPING: (DepartmentTimekeepingEntry & { lecturerUserId: string; unitId: string })[] = [
  { sessionId: 'dts-1', unitId: 'u1', unitCode: 'CS301', lecturerName: lecturer.fullName, lecturerUserId: lecturer.id, scheduledStartAt: hoursAgo(4).toISOString(), opensAt: hoursAgo(4).toISOString(), lateMinutes: 0 },
  { sessionId: 'dts-2', unitId: 'u2', unitCode: 'CS405', lecturerName: lecturer.fullName, lecturerUserId: lecturer.id, scheduledStartAt: hoursAgo(28).toISOString(), opensAt: new Date(hoursAgo(28).getTime() - 3 * 60_000).toISOString(), lateMinutes: -3 },
  { sessionId: 'dts-3', unitId: 'u1', unitCode: 'CS301', lecturerName: lecturer.fullName, lecturerUserId: lecturer.id, scheduledStartAt: hoursAgo(52).toISOString(), opensAt: new Date(hoursAgo(52).getTime() + 2 * 60_000).toISOString(), lateMinutes: 2 },
  { sessionId: 'dts-4', unitId: 'u3', unitCode: 'CS502', lecturerName: 'Dr. Mary Wambui', lecturerUserId: 'lec-2', scheduledStartAt: hoursAgo(7).toISOString(), opensAt: new Date(hoursAgo(7).getTime() + 9 * 60_000).toISOString(), lateMinutes: 9 },
  { sessionId: 'dts-5', unitId: 'u5', unitCode: 'CS410', lecturerName: 'Dr. Mary Wambui', lecturerUserId: 'lec-2', scheduledStartAt: null, opensAt: hoursAgo(30).toISOString(), lateMinutes: null },
  { sessionId: 'dts-6', unitId: 'u4', unitCode: 'CS210', lecturerName: 'Mr. Peter Njuguna', lecturerUserId: 'lec-3', scheduledStartAt: hoursAgo(9).toISOString(), opensAt: new Date(hoursAgo(9).getTime() + 23 * 60_000).toISOString(), lateMinutes: 23 },
  { sessionId: 'dts-7', unitId: 'u4', unitCode: 'CS210', lecturerName: 'Mr. Peter Njuguna', lecturerUserId: 'lec-3', scheduledStartAt: hoursAgo(33).toISOString(), opensAt: new Date(hoursAgo(33).getTime() + 16 * 60_000).toISOString(), lateMinutes: 16 },
]

/** Demo rates for the department-wide student list, chosen to show a mix of Active and At Risk standing. */
const DEMO_DEPARTMENT_STUDENT_RATES = [96, 81, 69, 88, 74, 93, 58, 100]

/**
 * Students on colleagues' units. Kept separate from `allocations` (the seeded
 * lecturer's own rosters, which the lecturer portal's tests count) so the
 * department list can be wider without changing what a lecturer sees.
 */
const DEPARTMENT_EXTRA_STUDENTS: { unitId: string; registrationNumber: string; fullName: string }[] = [
  { unitId: 'u3', registrationNumber: 'SC211/0007/2022', fullName: 'Grace Nyambura Maina' },
  { unitId: 'u3', registrationNumber: 'SC211/0008/2022', fullName: 'Hassan Ali Noor' },
  { unitId: 'u4', registrationNumber: 'SC211/0009/2023', fullName: 'Irene Chepkoech Lagat' },
  { unitId: 'u4', registrationNumber: 'SC211/0010/2023', fullName: 'John Mutua Kilonzo' },
]

/** Department pages are for department accounts only — mirrors the backend's role guard. */
const requireDepartment = () => {
  if (!store.get()) return unauthorized()
  if (currentAccount.role !== 'department') return fail(403, 'FORBIDDEN', 'Forbidden')
  return null
}

const departmentHandlers = [
  http.get(`${API}/departments/me`, () => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const officer = currentAccount as DepartmentOfficer
    const profile: DepartmentProfile = {
      departmentId: officer.departmentId,
      departmentName: officer.departmentName,
      departmentCode: 'DCOMP',
    }
    return ok(profile)
  }),

  http.get(`${API}/departments/overview`, async () => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    const rated = DEPARTMENT_UNITS.filter((u) => u.attendanceRate !== null)
    const overview: DepartmentOverview = {
      lecturerCount: DEPARTMENT_LECTURERS.length,
      studentCount: 212,
      unitCount: DEPARTMENT_UNITS.length,
      avgAttendanceRate: Math.round((rated.reduce((n, u) => n + (u.attendanceRate ?? 0), 0) / rated.length) * 10) / 10,
      sessionsHeld: DEPARTMENT_LECTURERS.reduce((n, l) => n + l.sessionsHeld, 0),
      onTimeRate: 78.5,
    }
    return ok(overview)
  }),

  http.get(`${API}/departments/lecturers`, async () => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    return ok(DEPARTMENT_LECTURERS.filter((l) => !isDeleted(l.userId)))
  }),

  /** Shaped exactly as the real backend sends it (department.repository.ts): identity nested under `lecturer`, sessions under `sessions` — lecturersApi.ts maps this to the flat DepartmentLecturerDetail the pages use. */
  http.get(`${API}/departments/lecturers/:lecturerUserId`, async ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    const row = DEPARTMENT_LECTURERS.find((l) => l.userId === params.lecturerUserId && !isDeleted(l.userId))
    if (!row) return fail(404, 'NOT_FOUND', 'Lecturer not found in this department.')
    const raw = {
      lecturer: { userId: row.userId, fullName: row.fullName, staffNumber: row.staffNumber, title: 'Dr.', email: `${row.userId}@university.edu` },
      units: DEPARTMENT_UNITS.filter((u) => u.lecturerUserId === row.userId)
        .map((u) => ({
          unitId: u.id, unitCode: u.code, unitName: u.name, lecturerUserId: u.lecturerUserId,
          lecturerName: u.lecturerName, activeStudents: u.studentCount, sessionsHeld: u.sessionsHeld, avgAttendanceRate: u.attendanceRate,
        })),
      sessions: DEPARTMENT_TIMEKEEPING.filter((t) => t.lecturerUserId === row.userId)
        .map((t) => ({
          sessionId: t.sessionId, unitId: DEPARTMENT_UNITS.find((u) => u.code === t.unitCode)?.id ?? '', unitCode: t.unitCode,
          title: null, status: 'CLOSED', opensAt: t.opensAt, closesAt: t.opensAt, scheduledStartAt: t.scheduledStartAt,
          lateMinutes: t.lateMinutes, present: 0, total: 0, attendanceRate: null,
        }))
        .sort((a, b) => b.opensAt.localeCompare(a.opensAt)),
    }
    return ok(raw)
  }),

  http.delete(`${API}/departments/lecturers/:lecturerUserId`, async ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    const row = DEPARTMENT_LECTURERS.find((l) => l.userId === params.lecturerUserId && !isDeleted(l.userId))
    if (!row) return fail(404, 'NOT_FOUND', 'No such lecturer in your department.')
    deletedUserIds.add(row.userId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(`${API}/departments/students/:studentUserId`, async ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    const studentUserId = params.studentUserId as string
    const found = !isDeleted(studentUserId) && [...allocations.values()].some((roster) => roster.some((a) => a.studentUserId === studentUserId))
    if (found) deletedUserIds.add(studentUserId)
    return found ? new HttpResponse(null, { status: 204 }) : fail(404, 'NOT_FOUND', 'No such student in your department.')
  }),

  /** One row per (student, unit) across the department — same shape as /lecturers/students. */
  http.get(`${API}/departments/students`, async () => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    let i = 0
    const rows: LecturerStudent[] = [...allocations.entries()].flatMap(([unitId, roster]) => {
      const unit = DEPARTMENT_UNITS.find((u) => u.id === unitId)
      if (!unit) return []
      return roster.filter((a) => !isDeleted(a.studentUserId)).map((a): LecturerStudent => {
        const rate = DEMO_DEPARTMENT_STUDENT_RATES[i++ % DEMO_DEPARTMENT_STUDENT_RATES.length]!
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
    for (const extra of DEPARTMENT_EXTRA_STUDENTS) {
      const unit = DEPARTMENT_UNITS.find((u) => u.id === extra.unitId)
      if (!unit) continue
      const rate = DEMO_DEPARTMENT_STUDENT_RATES[i++ % DEMO_DEPARTMENT_STUDENT_RATES.length]!
      rows.push({
        id: `dep-alloc-${extra.registrationNumber}`,
        registrationNumber: extra.registrationNumber,
        studentUserId: null,
        fullName: extra.fullName,
        unitId: unit.id,
        unitCode: unit.code,
        unitName: unit.name,
        sessionsHeld: 18,
        sessionsAttended: Math.round((rate / 100) * 18),
        attendanceRate: rate,
      })
    }
    return ok(rows)
  }),

  /** Shaped exactly as the real backend sends it (department.repository.ts) — unitsApi.ts maps unitId/unitCode/... to the DepartmentUnit the page uses. */
  http.get(`${API}/departments/units`, async () => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    const rows = DEPARTMENT_UNITS.map((u) => ({
      unitId: u.id, unitCode: u.code, unitName: u.name, lecturerUserId: u.lecturerUserId,
      lecturerName: u.lecturerName, activeStudents: u.studentCount, sessionsHeld: u.sessionsHeld, avgAttendanceRate: u.attendanceRate,
    }))
    return ok(rows)
  }),

  http.get(`${API}/departments/timekeeping`, async ({ request }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    await delay(200)
    const query = new URL(request.url).searchParams
    const lecturerUserId = query.get('lecturerUserId')
    const unitId = query.get('unitId')
    const limit = Number(query.get('limit') ?? 20)
    const rows: DepartmentTimekeepingEntry[] = DEPARTMENT_TIMEKEEPING
      .filter((t) => (!lecturerUserId || t.lecturerUserId === lecturerUserId) && (!unitId || t.unitId === unitId))
      .sort((a, b) => b.opensAt.localeCompare(a.opensAt))
      .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 20)
      .map(({ lecturerUserId: _lecturerUserId, unitId: _unitId, ...entry }) => entry)
    return ok(rows)
  }),

  ...teachingHandlers(API, requireDepartment),
]

/* ------------------------------------------------------------------ *
 * Departments, lecturers and units: seed data shared by the department,
 * management and admin mocks below, so the portals never disagree about them.
 * ------------------------------------------------------------------ */

const DEPARTMENTS_SEED = [
  { id: 'dept-cs', name: 'Computer Science', code: 'DCOMP' },
  { id: 'dept-se', name: 'Software Engineering', code: 'DSE' },
  // Exists but nobody has been assigned to it yet — the real seeded data has departments like this.
  { id: 'dept-as', name: 'Actuarial Science', code: 'DAS' },
]

interface SeedLecturer { userId: string; fullName: string; staffNumber: string; departmentId: string; departmentName: string; isOwnStaff: boolean; unitsTaught: number; unitsElsewhere: number; studentsTaught: number; avgAttendanceRate: number; sessionsHeld: number; avgLateMinutes: number; onTimeRate: number }
interface SeedUnit { unitId: string; unitCode: string; unitName: string | null; lecturerUserId: string; lecturerName: string; departmentId: string; departmentName: string; activeStudents: number; sessionsHeld: number; avgAttendanceRate: number }

const SEED_LECTURERS: SeedLecturer[] = [
  { userId: lecturer.id, fullName: lecturer.fullName, staffNumber: lecturer.staffNumber, departmentId: 'dept-cs', departmentName: 'Computer Science', isOwnStaff: true, unitsTaught: 2, unitsElsewhere: 0, studentsTaught: 151, avgAttendanceRate: 92.5, sessionsHeld: 38, avgLateMinutes: 1.2, onTimeRate: 94.7 },
  { userId: 'lec-2', fullName: 'Dr. Mary Wambui', staffNumber: 'STF/02291', departmentId: 'dept-cs', departmentName: 'Computer Science', isOwnStaff: true, unitsTaught: 2, unitsElsewhere: 1, studentsTaught: 93, avgAttendanceRate: 76, sessionsHeld: 22, avgLateMinutes: 8.4, onTimeRate: 63.6 },
  { userId: 'lec-3', fullName: 'Mr. Peter Njuguna', staffNumber: 'STF/03480', departmentId: 'dept-se', departmentName: 'Software Engineering', isOwnStaff: true, unitsTaught: 1, unitsElsewhere: 0, studentsTaught: 110, avgAttendanceRate: 68, sessionsHeld: 14, avgLateMinutes: 17.9, onTimeRate: 42.9 },
]

const SEED_UNITS: SeedUnit[] = [
  { unitId: 'u1', unitCode: 'CS301', unitName: 'Data Structures & Algorithms', lecturerUserId: lecturer.id, lecturerName: lecturer.fullName, departmentId: 'dept-cs', departmentName: 'Computer Science', activeStudents: 87, sessionsHeld: 20, avgAttendanceRate: 90 },
  { unitId: 'u2', unitCode: 'CS405', unitName: 'Database Management Systems', lecturerUserId: lecturer.id, lecturerName: lecturer.fullName, departmentId: 'dept-cs', departmentName: 'Computer Science', activeStudents: 64, sessionsHeld: 18, avgAttendanceRate: 95 },
  { unitId: 'u3', unitCode: 'CS502', unitName: 'Software Engineering Principles', lecturerUserId: 'lec-2', lecturerName: 'Dr. Mary Wambui', departmentId: 'dept-cs', departmentName: 'Computer Science', activeStudents: 52, sessionsHeld: 14, avgAttendanceRate: 76 },
  { unitId: 'u4', unitCode: 'CS210', unitName: 'Object-Oriented Programming', lecturerUserId: 'lec-3', lecturerName: 'Mr. Peter Njuguna', departmentId: 'dept-se', departmentName: 'Software Engineering', activeStudents: 110, sessionsHeld: 14, avgAttendanceRate: 68 },
  // Timetabled but never activated yet — the real backend's COALESCE(...,0) means this reads 0%, not null.
  { unitId: 'u5', unitCode: 'CS410', unitName: 'Distributed Systems', lecturerUserId: 'lec-2', lecturerName: 'Dr. Mary Wambui', departmentId: 'dept-cs', departmentName: 'Computer Science', activeStudents: 41, sessionsHeld: 0, avgAttendanceRate: 0 },
]

/* ------------------------------------------------------------------ *
 * Management portal (GET /management/*): university-wide.
 *
 * The seeded departments plus Business Administration, each with its code.
 * A unit's year is the
 * first digit of its code, as on the backend (CS502 is postgraduate and in
 * no year). Each unit's roster is generated from a few names, attended
 * classes spread around the unit's rate, so every figure is derived from
 * the same rows and the levels always agree with each other.
 * ------------------------------------------------------------------ */

const MANAGEMENT_DEPARTMENTS = [
  ...DEPARTMENTS_SEED.map((d) => ({ departmentId: d.id, departmentName: d.name, departmentCode: d.code })),
  { departmentId: 'dept-ba', departmentName: 'Business Administration', departmentCode: 'DBA' },
]

const MANAGEMENT_UNITS_SEED: { unitId: string; unitCode: string; unitName: string | null; departmentId: string; lecturerUserId: string; lecturerName: string; staffNumber: string | null; sessionsHeld: number; rate: number }[] = [
  { unitId: 'u6', unitCode: 'CS110', unitName: 'Introduction to Programming', departmentId: 'dept-cs', lecturerUserId: 'lec-2', lecturerName: 'Dr. Mary Wambui', staffNumber: 'STF/02291', sessionsHeld: 16, rate: 82 },
  ...SEED_UNITS.map((u) => {
    const teacher = SEED_LECTURERS.find((l) => l.userId === u.lecturerUserId)!
    return { unitId: u.unitId, unitCode: u.unitCode, unitName: u.unitName, departmentId: u.departmentId, lecturerUserId: u.lecturerUserId, lecturerName: u.lecturerName, staffNumber: teacher.staffNumber, sessionsHeld: u.sessionsHeld, rate: u.avgAttendanceRate }
  }),
  { unitId: 'u7', unitCode: 'BBA101', unitName: 'Principles of Management', departmentId: 'dept-ba', lecturerUserId: 'lec-4', lecturerName: 'Dr. Ruth Kendi', staffNumber: 'STF/04102', sessionsHeld: 12, rate: 61 },
]

const ROSTER = ['Ama Mensah', 'Brian Kiprono', 'Cynthia Atieno', 'David Mwangi', 'Esther Chebet', 'Felix Omondi']
/** How far each roster position sits from the unit's rate, in points: one student well under, the rest around it. */
const ROSTER_SPREAD = [-30, -8, 0, 4, 8, 12]

/** Every unit with its roster; `departmentId` is the mock's own, for filtering, and is not sent. */
const managementUnits = (): (ManagementUnit & { departmentId: string })[] =>
  MANAGEMENT_UNITS_SEED.map(({ rate, ...u }) => {
    const students: ManagementStudent[] = ROSTER.map((fullName, i) => {
      const attended = Math.max(0, Math.min(u.sessionsHeld, Math.round((u.sessionsHeld * (rate + ROSTER_SPREAD[i]!)) / 100)))
      return {
        studentUserId: `mstu-${i + 1}`,
        registrationNumber: `EBT1/${String(1000 + i)}/23`,
        fullName,
        yearOfStudy: unitYear(u.unitCode),
        sessionsHeld: u.sessionsHeld,
        sessionsAttended: attended,
        attendanceRate: u.sessionsHeld > 0 ? (attended / u.sessionsHeld) * 100 : null,
      }
    })
    return { ...u, avgAttendanceRate: u.sessionsHeld > 0 ? rate : null, students }
  })

/** The first digit of the code, when it is 1–4 (management.repository.ts UNIT_YEAR). */
const unitYear = (code: string): number | null => {
  const digit = Number(code.match(/[0-9]/)?.[0])
  return digit >= 1 && digit <= 4 ? digit : null
}

const mean = (rates: (number | null)[]) => {
  const measured = rates.filter((r): r is number => r !== null)
  return measured.length ? measured.reduce((n, r) => n + r, 0) / measured.length : null
}

const summarise = (list: ManagementUnit[]) => ({
  unitCount: list.length,
  studentCount: new Set(list.flatMap((u) => u.students.map((s) => s.registrationNumber))).size,
  sessionsHeld: list.reduce((n, u) => n + u.sessionsHeld, 0),
  checkIns: list.reduce((n, u) => n + u.students.reduce((m, s) => m + s.sessionsAttended, 0), 0),
  avgAttendanceRate: mean(list.map((u) => u.avgAttendanceRate)),
})

/** Management pages are for the management role only. */
const requireManagement = () => {
  if (!store.get()) return unauthorized()
  if (currentAccount.role !== 'management') return fail(403, 'FORBIDDEN', 'Forbidden')
  return null
}

const managementHandlers = [
  http.get(`${API}/management/departments`, async () => {
    const blocked = requireManagement()
    if (blocked) return blocked
    await delay(150)
    const all = managementUnits()
    const departments: ManagementDepartment[] = MANAGEMENT_DEPARTMENTS
      .map((d) => ({ ...d, ...summarise(all.filter((u) => u.departmentId === d.departmentId)) }))
      .sort((a, b) => b.checkIns - a.checkIns || a.departmentName.localeCompare(b.departmentName))
    const university: ManagementUniversity = {
      totals: {
        departmentCount: departments.length,
        checkIns: departments.reduce((n, d) => n + d.checkIns, 0),
        sessionsHeld: departments.reduce((n, d) => n + d.sessionsHeld, 0),
      },
      departments,
    }
    return ok(university)
  }),

  http.get(`${API}/management/departments/:departmentId`, async ({ params }) => {
    const blocked = requireManagement()
    if (blocked) return blocked
    await delay(150)
    const department = MANAGEMENT_DEPARTMENTS.find((d) => d.departmentId === params.departmentId)
    if (!department) return fail(404, 'NOT_FOUND', 'Department not found.')
    const own = managementUnits().filter((u) => u.departmentId === department.departmentId)
    const detail: ManagementDepartmentYears = {
      ...department,
      years: [1, 2, 3, 4].map((year) => ({ year, ...summarise(own.filter((u) => unitYear(u.unitCode) === year)) })),
      unitsWithoutYear: own.filter((u) => unitYear(u.unitCode) === null).length,
    }
    return ok(detail)
  }),

  http.get(`${API}/management/departments/:departmentId/years/:year`, async ({ params }) => {
    const blocked = requireManagement()
    if (blocked) return blocked
    await delay(150)
    const year = Number(params.year)
    if (!Number.isInteger(year) || year < 1 || year > 4) return fail(400, 'VALIDATION_FAILED', 'Year 1 to 4.')
    const department = MANAGEMENT_DEPARTMENTS.find((d) => d.departmentId === params.departmentId)
    if (!department) return fail(404, 'NOT_FOUND', 'Department not found.')
    const detail: ManagementYearDetail = {
      ...department,
      year,
      units: managementUnits()
        .filter((u) => u.departmentId === department.departmentId && unitYear(u.unitCode) === year)
        .sort((a, b) => a.unitCode.localeCompare(b.unitCode))
        .map(({ departmentId: _departmentId, ...unit }) => unit),
    }
    return ok(detail)
  }),
]

/*
 * Admin console and invitations (src/modules/admin, auth.invitation.ts on the real backend).
 * Invitation links are `invite-<n>`; tests read the newest with lastMockInvitationToken().
 */
const OFFICERS_SEED = (): Officer[] => [
  { userId: adminUser.id, role: 'admin', fullName: adminUser.fullName, email: adminUser.email, status: 'ACTIVE', departmentId: null, departmentName: null, invitedAt: '2026-09-01T08:00:00Z', invitationExpiresAt: null, lastLoginAt: '2026-10-10T07:30:00Z' },
  { userId: managementAccount.id, role: 'management', fullName: managementAccount.fullName, email: managementAccount.email, status: 'ACTIVE', departmentId: null, departmentName: null, invitedAt: '2026-09-02T08:00:00Z', invitationExpiresAt: null, lastLoginAt: '2026-10-09T09:00:00Z' },
  { userId: departmentOfficer.id, role: 'department', fullName: departmentOfficer.fullName, email: departmentOfficer.email, status: 'ACTIVE', departmentId: 'dept-cs', departmentName: 'Computer Science', invitedAt: '2026-09-03T08:00:00Z', invitationExpiresAt: null, lastLoginAt: null },
]
const PENDING_UNITS_SEED = (): PendingUnit[] => [
  {
    unitId: 'pending-1', code: 'COSC 340', name: 'Distributed Systems', lecturerName: 'Dr. Brian Otieno', staffNumber: 'STF/0007',
    departmentName: 'Computer Science', createdAt: '2026-10-14T09:12:00Z',
    slots: [{ dayOfWeek: 2, startTime: '10:00', endTime: '12:00', roomCode: 'LH3' }],
  },
  {
    unitId: 'pending-2', code: 'MATH 210', name: 'Linear Algebra II', lecturerName: 'Ms. Faith Wanjiru', staffNumber: 'STF/0019',
    departmentName: null, createdAt: '2026-10-16T13:40:00Z', slots: [],
  },
]
/** SMARTTT's admin functions (/admin/smarttt/...), which the real backend passes on to SMARTTT. */
const SMARTTT_ADMIN_SEED = () => ({
  terms: [
    { id: 'term-2026-1', academic_year: '2026/2027', semester: 1, start_date: '2026-09-07', end_date: '2026-12-18', is_current: true },
    { id: 'term-2025-3', academic_year: '2025/2026', semester: 3, start_date: '2026-05-04', end_date: '2026-08-21', is_current: false },
  ],
  uploads: [
    { id: 'upload-1', source_file: 'timetable_uploads/2026/09/TUN_SEP_DEC_2026_TT_V2.pdf', status: 'processed', rows_received: 1663, rows_saved: 1663, rows_failed: 0, created_at: '2026-09-19T10:00:00Z', uploaded_by_name: 'Ms. Aisha Njeri' },
  ],
  allocations: [
    { source: 'Computer Science and ICT', file_name: 'VETTED_SEP-DEC ALLOCATION 2026.docx', rows: 240, slots_assigned: 212, uploaded_by: 'Ms. Aisha Njeri', uploaded_at: '2026-09-21T08:30:00Z' },
  ],
  notifications: [
    { id: 'notif-1', title: 'Timetable V2 is out', notification_type: 'timetable_change', target: 'all', recipients_count: 5120, sent_at: '2026-09-19T11:00:00Z' },
  ],
  programs: [{ id: 1, name: 'BSc Computer Science' }, { id: 2, name: 'Bachelor of Education (Arts)' }],
  staffIds: [
    { id: 'staff-1', staff_id: 'STF/0001', name_hint: 'Peter Kamami', is_claimed: true, uploaded_at: '2026-08-01T08:00:00Z', file_name: 'staff_ids.csv' },
    { id: 'staff-2', staff_id: 'STF/0002', name_hint: null, is_claimed: false, uploaded_at: '2026-08-01T08:00:00Z', file_name: 'staff_ids.csv' },
  ],
  staffIdUploads: [
    { id: 'staff-upload-1', file_name: 'staff_ids.csv', ids_created: 2, ids_skipped: 0, ids_remaining: 2, ids_claimed: 1, uploaded_by: 'Ms. Aisha Njeri', uploaded_at: '2026-08-01T08:00:00Z' },
  ],
  venues: { total: 102, confirmed: 99, unconfirmed: 3, unconfirmed_codes: ['G 12', 'UTC-AA 3', 'STB 4'] },
})
let smartttAdmin = SMARTTT_ADMIN_SEED()

let officers = OFFICERS_SEED()
let pendingUnits = PENDING_UNITS_SEED()
/** token -> invited user id */
const invitations = new Map<string, string>()
let invitationCounter = 0

function resetOfficerMocks() {
  officers = OFFICERS_SEED()
  pendingUnits = PENDING_UNITS_SEED()
  smartttAdmin = SMARTTT_ADMIN_SEED()
  invitations.clear()
}

/** Test helper: the newest invitation link's token, as the email would carry it. */
export const lastMockInvitationToken = () => [...invitations.keys()].at(-1) ?? null

const requireAdmin = () => {
  if (!store.get()) return unauthorized()
  if (currentAccount.role !== 'admin') return fail(403, 'FORBIDDEN', 'Forbidden')
  return null
}

const issueInvitation = (userId: string) => {
  for (const [token, id] of invitations) if (id === userId) invitations.delete(token)
  const token = `invite-${++invitationCounter}`
  invitations.set(token, userId)
  const officer = officers.find((o) => o.userId === userId)!
  officer.invitedAt = new Date().toISOString()
  officer.invitationExpiresAt = new Date(Date.now() + 72 * 3_600_000).toISOString()
  return ok({ userId, emailSent: true }, 201)
}

const inviteOfficer = (invitee: { fullName?: string; email?: string }, scope: Pick<Officer, 'role' | 'departmentId' | 'departmentName'>) => {
  const email = invitee.email?.trim().toLowerCase() ?? ''
  if (!invitee.fullName?.trim() || !email.includes('@')) return fail(400, 'VALIDATION_FAILED', 'Enter a full name and a valid email.')
  if (accounts.has(email) || officers.some((o) => o.email === email)) return fail(409, 'ACCOUNT_ALREADY_EXISTS', 'Someone already has an account with this email address.')
  const userId = `inv-${invitationCounter + 1}`
  officers.push({ userId, fullName: invitee.fullName.trim(), email, status: 'PENDING_VERIFICATION', invitedAt: null, invitationExpiresAt: null, lastLoginAt: null, ...scope })
  return issueInvitation(userId)
}

const resendOfficer = (officer: Officer | undefined) => {
  if (!officer) return fail(404, 'NOT_FOUND', 'No such officer.')
  if (officer.status !== 'PENDING_VERIFICATION') return fail(409, 'CONFLICT', 'This person has already accepted their invitation.')
  return issueInvitation(officer.userId)
}

const deactivateOfficer = (officer: Officer | undefined) => {
  if (!officer) return fail(404, 'NOT_FOUND', 'No such officer.')
  if (officer.userId === currentAccount.id) return fail(400, 'BAD_REQUEST', 'You cannot remove your own access.')
  officer.status = 'DEACTIVATED'
  officer.invitationExpiresAt = null
  for (const [token, id] of invitations) if (id === officer.userId) invitations.delete(token)
  return new HttpResponse(null, { status: 204 })
}

/* ------------------------------------------------------------------
 * Quality assurance portal (GET /quality-assurance/*)
 *
 * Not auto-scoped to the officer — a QA officer's remit is the whole
 * institution — so every list handler below takes explicit filters
 * instead of resolving a department from the signed-in account.
 * One completed audit (with a non-compliant finding and its corrective
 * action already raised) and one planned audit with nothing filled in yet,
 * so both the dashboard and the "fill checklist" flow have something real
 * to show by default.
 * ------------------------------------------------------------------ */

/** Monthly attendance-rate points, reconciling with what each department's own officer sees. */
const QA_ATTENDANCE_TRENDS: QaAttendanceTrendPoint[] = [
  { periodStart: '2026-08-01', departmentId: 'dept-cs', departmentName: 'Computer Science', avgAttendanceRate: 88.2 },
  { periodStart: '2026-09-01', departmentId: 'dept-cs', departmentName: 'Computer Science', avgAttendanceRate: 91.4 },
  { periodStart: '2026-10-01', departmentId: 'dept-cs', departmentName: 'Computer Science', avgAttendanceRate: 86.9 },
  { periodStart: '2026-09-01', departmentId: 'dept-se', departmentName: 'Software Engineering', avgAttendanceRate: 74.5 },
  { periodStart: '2026-10-01', departmentId: 'dept-se', departmentName: 'Software Engineering', avgAttendanceRate: 47.3 },
]

const QA_STANDARDS_SEED = (): QaStandard[] => [
  { id: 'std-gov-1', code: 'STD-GOV-01', category: 'GOVERNANCE', title: 'Institutional governance and leadership', description: null, displayOrder: 0, isActive: true, createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
  { id: 'std-prog-1', code: 'STD-PROG-01', category: 'ACADEMIC_PROGRAMS', title: 'Curriculum design and academic programs', description: null, displayOrder: 0, isActive: true, createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
  { id: 'std-staff-1', code: 'STD-STAFF-01', category: 'STAFF', title: 'Staff qualifications and development', description: null, displayOrder: 0, isActive: true, createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
  { id: 'std-fac-1', code: 'STD-FAC-01', category: 'FACILITIES', title: 'Physical and learning facilities', description: null, displayOrder: 0, isActive: false, createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
]

interface MockQaItem extends QaChecklistItem {}
const QA_ITEMS_SEED = (): MockQaItem[] => [
  { id: 'item-1', templateId: 'tmpl-1', standardId: 'std-gov-1', standardCode: 'STD-GOV-01', standardTitle: 'Institutional governance and leadership', standardCategory: 'GOVERNANCE', prompt: 'Does the unit publish an up-to-date governance charter?', guidance: null, sortOrder: 0 },
  { id: 'item-2', templateId: 'tmpl-1', standardId: 'std-prog-1', standardCode: 'STD-PROG-01', standardTitle: 'Curriculum design and academic programs', standardCategory: 'ACADEMIC_PROGRAMS', prompt: 'Are course outlines reviewed within the last two years?', guidance: null, sortOrder: 1 },
  { id: 'item-3', templateId: 'tmpl-1', standardId: 'std-staff-1', standardCode: 'STD-STAFF-01', standardTitle: 'Staff qualifications and development', standardCategory: 'STAFF', prompt: 'Do all teaching staff hold the required minimum qualification?', guidance: 'Check staff files against the minimum-qualification policy.', sortOrder: 2 },
]

interface MockQaTemplate { id: string; name: string; description: string | null; isActive: boolean; createdAt: string; updatedAt: string }
const QA_TEMPLATES_SEED = (): MockQaTemplate[] => [
  { id: 'tmpl-1', name: 'General Internal Audit Checklist', description: 'One checklist item per standard, for a routine department audit.', isActive: true, createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
]

interface MockQaAudit {
  id: string; title: string; auditType: 'INTERNAL'; targetDepartmentId: string;
  checklistTemplateId: string; leadAuditorUserId: string; scheduledDate: string; status: QaAuditStatus;
  startedAt: string | null; completedAt: string | null; notes: string | null; createdAt: string; updatedAt: string;
}
const QA_AUDITS_SEED = (): MockQaAudit[] => [
  {
    id: 'audit-1', title: 'CS Department Q3 Internal Audit', auditType: 'INTERNAL', targetDepartmentId: 'dept-cs',
    checklistTemplateId: 'tmpl-1', leadAuditorUserId: qaOfficer.id, scheduledDate: '2026-09-15', status: 'COMPLETED',
    startedAt: '2026-09-15T08:00:00Z', completedAt: '2026-09-16T10:00:00Z', notes: null, createdAt: '2026-09-10T08:00:00Z', updatedAt: '2026-09-16T10:00:00Z',
  },
  {
    id: 'audit-2', title: 'Software Engineering Annual Review', auditType: 'INTERNAL', targetDepartmentId: 'dept-se',
    checklistTemplateId: 'tmpl-1', leadAuditorUserId: qaOfficer.id, scheduledDate: '2026-12-01', status: 'PLANNED',
    startedAt: null, completedAt: null, notes: null, createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T08:00:00Z',
  },
]

interface MockQaFinding { id: string; auditId: string; checklistItemId: string; rating: QaFindingRating; score: number | null; evidenceNotes: string | null; recordedByUserId: string; createdAt: string; updatedAt: string }
const QA_FINDINGS_SEED = (): MockQaFinding[] => [
  { id: 'finding-1', auditId: 'audit-1', checklistItemId: 'item-1', rating: 'COMPLIANT', score: null, evidenceNotes: null, recordedByUserId: qaOfficer.id, createdAt: '2026-09-15T09:00:00Z', updatedAt: '2026-09-15T09:00:00Z' },
  { id: 'finding-2', auditId: 'audit-1', checklistItemId: 'item-2', rating: 'NON_COMPLIANT', score: null, evidenceNotes: 'Several course outlines have not been reviewed since 2022.', recordedByUserId: qaOfficer.id, createdAt: '2026-09-15T09:05:00Z', updatedAt: '2026-09-15T09:05:00Z' },
  { id: 'finding-3', auditId: 'audit-1', checklistItemId: 'item-3', rating: 'PARTIAL', score: null, evidenceNotes: null, recordedByUserId: qaOfficer.id, createdAt: '2026-09-15T09:10:00Z', updatedAt: '2026-09-15T09:10:00Z' },
]

interface MockQaCapa {
  id: string; findingId: string; description: string; ownerUserId: string; ownerName: string; dueDate: string; status: QaCapaStatus;
  verifiedByUserId: string | null; verifiedByName: string | null; verifiedAt: string | null; createdAt: string; updatedAt: string;
}
/** Overdue on purpose: due date in the past, still OPEN — drives the dashboard's overdue count and the Corrective Actions page's "Overdue" badge. */
const QA_CAPAS_SEED = (): MockQaCapa[] => [
  { id: 'capa-1', findingId: 'finding-2', description: 'Review and republish every course outline older than two years.', ownerUserId: qaOfficer.id, ownerName: qaOfficer.fullName, dueDate: '2026-10-01', status: 'OPEN', verifiedByUserId: null, verifiedByName: null, verifiedAt: null, createdAt: '2026-09-16T10:30:00Z', updatedAt: '2026-09-16T10:30:00Z' },
  // Not overdue, so the "overdue only" filter has something to hide.
  { id: 'capa-2', findingId: 'finding-3', description: 'Run a qualification audit of every part-time lecturer.', ownerUserId: qaOfficer.id, ownerName: qaOfficer.fullName, dueDate: '2027-03-31', status: 'IN_PROGRESS', verifiedByUserId: null, verifiedByName: null, verifiedAt: null, createdAt: '2026-09-16T10:35:00Z', updatedAt: '2026-09-16T10:35:00Z' },
]

let qaStandards = QA_STANDARDS_SEED()
let qaItems = QA_ITEMS_SEED()
let qaTemplates = QA_TEMPLATES_SEED()
let qaAudits = QA_AUDITS_SEED()
let qaFindings = QA_FINDINGS_SEED()
let qaCapas = QA_CAPAS_SEED()
let qaIdCounter = 0

function resetQaMocks() {
  qaStandards = QA_STANDARDS_SEED()
  qaItems = QA_ITEMS_SEED()
  qaTemplates = QA_TEMPLATES_SEED()
  qaAudits = QA_AUDITS_SEED()
  qaFindings = QA_FINDINGS_SEED()
  qaCapas = QA_CAPAS_SEED()
}

const requireQa = () => {
  if (!store.get()) return unauthorized()
  if (currentAccount.role !== 'qa') return fail(403, 'FORBIDDEN', 'Forbidden')
  return null
}

const QA_AUDIT_FORWARD: Record<QaAuditStatus, QaAuditStatus | null> = { PLANNED: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', COMPLETED: null }
const QA_CAPA_FORWARD: Record<QaCapaStatus, QaCapaStatus | null> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'VERIFIED', VERIFIED: 'CLOSED', CLOSED: null }

/** COMPLIANT=100, PARTIAL=50, NON_COMPLIANT=0; NOT_APPLICABLE has no fallback and must be excluded first — mirrors kpi.service.ts. */
function fallbackScoreFor(rating: QaFindingRating): number | null {
  if (rating === 'COMPLIANT') return 100
  if (rating === 'PARTIAL') return 50
  if (rating === 'NON_COMPLIANT') return 0
  return null
}
const round1 = (v: number) => Math.round(v * 10) / 10
function averageScore(findings: { rating: QaFindingRating; score: number | null }[]): number | null {
  const values = findings.map((f) => f.score ?? fallbackScoreFor(f.rating)).filter((v): v is number => v !== null)
  if (values.length === 0) return null
  return round1(values.reduce((sum, v) => sum + v, 0) / values.length)
}

function toAuditDto(a: MockQaAudit): QaAudit {
  const template = qaTemplates.find((t) => t.id === a.checklistTemplateId)
  const findingsForAudit = qaFindings.filter((f) => f.auditId === a.id)
  const totalItems = qaItems.filter((i) => i.templateId === a.checklistTemplateId).length
  return {
    id: a.id, title: a.title, auditType: a.auditType,
    targetDepartmentId: a.targetDepartmentId,
    targetDepartmentName: DEPARTMENTS_SEED.find((d) => d.id === a.targetDepartmentId)?.name ?? 'Unknown',
    checklistTemplateId: a.checklistTemplateId, checklistTemplateName: template?.name ?? 'Unknown',
    leadAuditorUserId: a.leadAuditorUserId, leadAuditorName: a.leadAuditorUserId === qaOfficer.id ? qaOfficer.fullName : 'Unknown',
    scheduledDate: a.scheduledDate, status: a.status, startedAt: a.startedAt, completedAt: a.completedAt, notes: a.notes,
    totalItems, findingsRecorded: findingsForAudit.length, createdAt: a.createdAt, updatedAt: a.updatedAt,
  }
}

function toCapaDto(c: MockQaCapa): QaCorrectiveAction {
  const finding = qaFindings.find((f) => f.id === c.findingId)!
  const item = qaItems.find((i) => i.id === finding.checklistItemId)!
  const audit = qaAudits.find((a) => a.id === finding.auditId)!
  const overdue = new Date(c.dueDate) < new Date() && c.status !== 'VERIFIED' && c.status !== 'CLOSED'
  return {
    id: c.id, findingId: c.findingId, description: c.description, ownerUserId: c.ownerUserId, ownerName: c.ownerName,
    dueDate: c.dueDate, status: c.status, verifiedByUserId: c.verifiedByUserId, verifiedByName: c.verifiedByName, verifiedAt: c.verifiedAt,
    isOverdue: overdue, auditId: audit.id, auditTitle: audit.title, rating: finding.rating, standardCode: item.standardCode, standardTitle: item.standardTitle,
    targetDepartmentId: audit.targetDepartmentId, createdAt: c.createdAt, updatedAt: c.updatedAt,
  }
}

function toTemplateDto(t: MockQaTemplate): QaChecklistTemplate {
  return { id: t.id, name: t.name, description: t.description, isActive: t.isActive, itemCount: qaItems.filter((i) => i.templateId === t.id).length, createdAt: t.createdAt, updatedAt: t.updatedAt }
}

const qaHandlers = [
  /** Bare id/name lookups so the "create audit" form can offer a name-based picker, the same reasoning the real backend's directory.controller.ts gives. */
  http.get(`${API}/quality-assurance/departments`, () => requireQa() ?? ok(DEPARTMENTS_SEED.map((d): QaDirectoryEntry => ({ id: d.id, name: d.name })))),

  http.get(`${API}/quality-assurance/standards`, () => requireQa() ?? ok(qaStandards)),
  http.post(`${API}/quality-assurance/standards`, async ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const input = (await request.json()) as { code: string; category: QaStandard['category']; title: string; description?: string; displayOrder?: number }
    if (!input.code?.trim() || !input.title?.trim()) return fail(400, 'VALIDATION_FAILED', 'Enter a code and a title.')
    const standard: QaStandard = {
      id: `std-${++qaIdCounter}`, code: input.code.trim(), category: input.category, title: input.title.trim(),
      description: input.description?.trim() || null, displayOrder: input.displayOrder ?? 0, isActive: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    qaStandards.push(standard)
    return ok(standard, 201)
  }),
  http.patch(`${API}/quality-assurance/standards/:id`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const standard = qaStandards.find((s) => s.id === params.id)
    if (!standard) return fail(404, 'NOT_FOUND', 'No such standard.')
    const input = (await request.json()) as Partial<Pick<QaStandard, 'code' | 'category' | 'title' | 'description' | 'displayOrder' | 'isActive'>>
    Object.assign(standard, input, { updatedAt: new Date().toISOString() })
    return ok(standard)
  }),

  http.get(`${API}/quality-assurance/checklist-templates`, () => requireQa() ?? ok(qaTemplates.map(toTemplateDto))),
  http.get(`${API}/quality-assurance/checklist-templates/:id`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const template = qaTemplates.find((t) => t.id === params.id)
    if (!template) return fail(404, 'NOT_FOUND', 'No such checklist template.')
    return ok({ ...toTemplateDto(template), items: qaItems.filter((i) => i.templateId === template.id).sort((a, b) => a.sortOrder - b.sortOrder) })
  }),
  http.post(`${API}/quality-assurance/checklist-templates`, async ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const input = (await request.json()) as { name: string; description?: string }
    if (!input.name?.trim()) return fail(400, 'VALIDATION_FAILED', 'Enter a name.')
    const template: MockQaTemplate = { id: `tmpl-${++qaIdCounter}`, name: input.name.trim(), description: input.description?.trim() || null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    qaTemplates.push(template)
    return ok(toTemplateDto(template), 201)
  }),
  http.patch(`${API}/quality-assurance/checklist-templates/:id`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const template = qaTemplates.find((t) => t.id === params.id)
    if (!template) return fail(404, 'NOT_FOUND', 'No such checklist template.')
    const input = (await request.json()) as Partial<Pick<MockQaTemplate, 'name' | 'description' | 'isActive'>>
    Object.assign(template, input, { updatedAt: new Date().toISOString() })
    return ok(toTemplateDto(template))
  }),
  http.post(`${API}/quality-assurance/checklist-templates/:id/items`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const template = qaTemplates.find((t) => t.id === params.id)
    if (!template) return fail(404, 'NOT_FOUND', 'No such checklist template.')
    const input = (await request.json()) as { standardId: string; prompt: string; guidance?: string; sortOrder?: number }
    const standard = qaStandards.find((s) => s.id === input.standardId)
    if (!standard || !input.prompt?.trim()) return fail(400, 'VALIDATION_FAILED', 'Choose a standard and enter a prompt.')
    const item: MockQaItem = {
      id: `item-${++qaIdCounter}`, templateId: template.id, standardId: standard.id, standardCode: standard.code, standardTitle: standard.title, standardCategory: standard.category,
      prompt: input.prompt.trim(), guidance: input.guidance?.trim() || null, sortOrder: input.sortOrder ?? qaItems.filter((i) => i.templateId === template.id).length,
    }
    qaItems.push(item)
    return ok(item, 201)
  }),
  http.delete(`${API}/quality-assurance/checklist-templates/:id/items/:itemId`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const item = qaItems.find((i) => i.id === params.itemId && i.templateId === params.id)
    if (!item) return fail(404, 'NOT_FOUND', 'No such checklist item.')
    if (qaFindings.some((f) => f.checklistItemId === item.id)) return fail(409, 'CONFLICT', 'This item already has findings recorded against it and cannot be removed.')
    qaItems = qaItems.filter((i) => i.id !== item.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/quality-assurance/audits`, ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const targetDepartmentId = url.searchParams.get('targetDepartmentId')
    const rows = qaAudits.filter((a) =>
      (!status || a.status === status) &&
      (!targetDepartmentId || a.targetDepartmentId === targetDepartmentId))
    return ok(rows.map(toAuditDto))
  }),
  http.get(`${API}/quality-assurance/audits/:id`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const audit = qaAudits.find((a) => a.id === params.id)
    if (!audit) return fail(404, 'NOT_FOUND', 'No such audit.')
    return ok(toAuditDto(audit))
  }),
  http.post(`${API}/quality-assurance/audits`, async ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const input = (await request.json()) as { title: string; targetDepartmentId?: string; checklistTemplateId: string; leadAuditorUserId: string; scheduledDate: string; notes?: string }
    if (!input.title?.trim() || !DEPARTMENTS_SEED.some((d) => d.id === input.targetDepartmentId) || !qaTemplates.some((t) => t.id === input.checklistTemplateId)) {
      return fail(400, 'VALIDATION_FAILED', 'The target department, checklist template or lead auditor does not exist.')
    }
    const audit: MockQaAudit = {
      id: `audit-${++qaIdCounter}`, title: input.title.trim(), auditType: 'INTERNAL',
      targetDepartmentId: input.targetDepartmentId!,
      checklistTemplateId: input.checklistTemplateId, leadAuditorUserId: input.leadAuditorUserId, scheduledDate: input.scheduledDate,
      status: 'PLANNED', startedAt: null, completedAt: null, notes: input.notes?.trim() || null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    qaAudits.push(audit)
    return ok(toAuditDto(audit), 201)
  }),
  http.patch(`${API}/quality-assurance/audits/:id`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const audit = qaAudits.find((a) => a.id === params.id)
    if (!audit) return fail(404, 'NOT_FOUND', 'No such audit.')
    const input = (await request.json()) as { title?: string; leadAuditorUserId?: string; scheduledDate?: string; notes?: string | null; status?: QaAuditStatus }
    if (input.title !== undefined) audit.title = input.title
    if (input.leadAuditorUserId !== undefined) audit.leadAuditorUserId = input.leadAuditorUserId
    if (input.scheduledDate !== undefined) audit.scheduledDate = input.scheduledDate
    if (input.notes !== undefined) audit.notes = input.notes
    if (input.status !== undefined && input.status !== audit.status) {
      if (QA_AUDIT_FORWARD[audit.status] !== input.status) return fail(400, 'VALIDATION_FAILED', `An audit cannot move from ${audit.status} to ${input.status}.`)
      if (input.status === 'COMPLETED') {
        const total = qaItems.filter((i) => i.templateId === audit.checklistTemplateId).length
        const recorded = qaFindings.filter((f) => f.auditId === audit.id).length
        if (recorded < total) return fail(400, 'VALIDATION_FAILED', `${total - recorded} checklist item(s) still need a finding before this audit can be completed.`)
      }
      audit.status = input.status
      if (input.status === 'IN_PROGRESS') audit.startedAt = new Date().toISOString()
      if (input.status === 'COMPLETED') audit.completedAt = new Date().toISOString()
    }
    audit.updatedAt = new Date().toISOString()
    return ok(toAuditDto(audit))
  }),
  http.get(`${API}/quality-assurance/audits/:id/checklist`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const audit = qaAudits.find((a) => a.id === params.id)
    if (!audit) return fail(404, 'NOT_FOUND', 'No such audit.')
    const rows = qaItems
      .filter((i) => i.templateId === audit.checklistTemplateId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const finding = qaFindings.find((f) => f.auditId === audit.id && f.checklistItemId === item.id)
        return {
          checklistItemId: item.id, prompt: item.prompt, guidance: item.guidance, sortOrder: item.sortOrder,
          standardId: item.standardId, standardCode: item.standardCode, standardTitle: item.standardTitle, standardCategory: item.standardCategory,
          finding: finding ? { id: finding.id, rating: finding.rating, score: finding.score, evidenceNotes: finding.evidenceNotes, recordedByUserId: finding.recordedByUserId, updatedAt: finding.updatedAt } : null,
        }
      })
    return ok(rows)
  }),
  http.get(`${API}/quality-assurance/audits/:id/findings`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    return ok(qaFindings.filter((f) => f.auditId === params.id))
  }),
  http.put(`${API}/quality-assurance/audits/:id/findings/:checklistItemId`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const audit = qaAudits.find((a) => a.id === params.id)
    if (!audit) return fail(404, 'NOT_FOUND', 'No such audit.')
    if (audit.status === 'COMPLETED') return fail(400, 'VALIDATION_FAILED', 'This audit is already completed.')
    const item = qaItems.find((i) => i.id === params.checklistItemId && i.templateId === audit.checklistTemplateId)
    if (!item) return fail(404, 'NOT_FOUND', 'No such checklist item on this audit.')
    const input = (await request.json()) as { rating: QaFindingRating; score?: number; evidenceNotes?: string }
    const existing = qaFindings.find((f) => f.auditId === audit.id && f.checklistItemId === item.id)
    const now = new Date().toISOString()
    const finding: MockQaFinding = existing
      ? Object.assign(existing, { rating: input.rating, score: input.score ?? null, evidenceNotes: input.evidenceNotes?.trim() || null, updatedAt: now })
      : { id: `finding-${++qaIdCounter}`, auditId: audit.id, checklistItemId: item.id, rating: input.rating, score: input.score ?? null, evidenceNotes: input.evidenceNotes?.trim() || null, recordedByUserId: currentAccount.id, createdAt: now, updatedAt: now }
    if (!existing) qaFindings.push(finding)
    return ok(finding, existing ? 200 : 201)
  }),

  http.get(`${API}/quality-assurance/corrective-actions`, ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const overdueParam = url.searchParams.get('overdue')
    const targetDepartmentId = url.searchParams.get('targetDepartmentId')
    const rows = qaCapas.map(toCapaDto).filter((c) =>
      (!status || c.status === status) &&
      (overdueParam === null || c.isOverdue === (overdueParam === 'true')) &&
      (!targetDepartmentId || c.targetDepartmentId === targetDepartmentId))
    return ok(rows)
  }),
  http.post(`${API}/quality-assurance/corrective-actions`, async ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const input = (await request.json()) as { findingId: string; description: string; ownerUserId: string; dueDate: string }
    const finding = qaFindings.find((f) => f.id === input.findingId)
    if (!finding) return fail(400, 'VALIDATION_FAILED', 'No such finding.')
    if (finding.rating !== 'NON_COMPLIANT' && finding.rating !== 'PARTIAL') {
      return fail(400, 'VALIDATION_FAILED', 'A corrective action can only be raised against a non-compliant or partial finding.')
    }
    const capa: MockQaCapa = {
      id: `capa-${++qaIdCounter}`, findingId: finding.id, description: input.description.trim(), ownerUserId: input.ownerUserId,
      ownerName: input.ownerUserId === qaOfficer.id ? qaOfficer.fullName : 'Unknown', dueDate: input.dueDate, status: 'OPEN',
      verifiedByUserId: null, verifiedByName: null, verifiedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    qaCapas.push(capa)
    return ok(toCapaDto(capa), 201)
  }),
  http.patch(`${API}/quality-assurance/corrective-actions/:id`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const capa = qaCapas.find((c) => c.id === params.id)
    if (!capa) return fail(404, 'NOT_FOUND', 'No such corrective action.')
    const input = (await request.json()) as { description?: string; ownerUserId?: string; dueDate?: string; status?: QaCapaStatus }
    if (input.description !== undefined) capa.description = input.description
    if (input.ownerUserId !== undefined) capa.ownerUserId = input.ownerUserId
    if (input.dueDate !== undefined) capa.dueDate = input.dueDate
    if (input.status !== undefined && input.status !== capa.status) {
      if (QA_CAPA_FORWARD[capa.status] !== input.status) return fail(400, 'VALIDATION_FAILED', `A corrective action cannot move from ${capa.status} to ${input.status}.`)
      capa.status = input.status
      // Stamped from the signed-in caller, never from the request body — mirrors capa.service.ts exactly.
      if (input.status === 'VERIFIED') {
        capa.verifiedByUserId = currentAccount.id
        capa.verifiedByName = currentAccount.fullName
        capa.verifiedAt = new Date().toISOString()
      }
    }
    capa.updatedAt = new Date().toISOString()
    return ok(toCapaDto(capa))
  }),

  http.get(`${API}/quality-assurance/dashboard`, ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const url = new URL(request.url)
    const targetDepartmentId = url.searchParams.get('targetDepartmentId')
    const audits = qaAudits.filter((a) =>
      (!targetDepartmentId || a.targetDepartmentId === targetDepartmentId))
    const auditIds = new Set(audits.map((a) => a.id))
    const findings = qaFindings.filter((f) => auditIds.has(f.auditId) && f.rating !== 'NOT_APPLICABLE')
    const withStandard = findings.map((f) => ({ finding: f, item: qaItems.find((i) => i.id === f.checklistItemId)! }))

    const byStandard = new Map<string, typeof withStandard>()
    for (const row of withStandard) {
      const list = byStandard.get(row.item.standardId) ?? []
      list.push(row)
      byStandard.set(row.item.standardId, list)
    }
    const complianceByStandard = [...byStandard.entries()].map(([standardId, rows]) => {
      const first = rows[0]!.item
      return { standardId, standardCode: first.standardCode, standardTitle: first.standardTitle, category: first.standardCategory, avgScore: averageScore(rows.map((r) => r.finding)), sampleCount: rows.length }
    })
    const byCategory = new Map<string, typeof withStandard>()
    for (const row of withStandard) {
      const list = byCategory.get(row.item.standardCategory) ?? []
      list.push(row)
      byCategory.set(row.item.standardCategory, list)
    }
    const complianceByCategory = [...byCategory.entries()].map(([category, rows]) => ({ category, avgScore: averageScore(rows.map((r) => r.finding)), sampleCount: rows.length }))

    const completed = audits.filter((a) => a.status === 'COMPLETED').length
    const overdueCapaCount = qaCapas.map(toCapaDto).filter((c) => c.isOverdue && auditIds.has(c.auditId)).length

    return ok({
      auditCompletionRate: audits.length === 0 ? null : round1((completed / audits.length) * 100),
      auditsCompleted: completed, auditsTotal: audits.length,
      complianceByStandard, complianceByCategory, overdueCapaCount,
      attendanceTrends: QA_ATTENDANCE_TRENDS.filter((p) => !targetDepartmentId || p.departmentId === targetDepartmentId),
    })
  }),
]

const smartttAdminHandlers = [
  http.get(`${API}/admin/directory`, () => requireAdmin() ?? ok({
    smartttConnected: true,
    onlyHere: { departments: ADMIN_DEPARTMENTS.filter((d) => !d.inSmarttt).length },
  })),
  http.post(`${API}/admin/directory/sync`, () => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const sent = ADMIN_DEPARTMENTS.filter((d) => !d.inSmarttt)
    sent.forEach((d) => { d.inSmarttt = true })
    return ok({ fromSmarttt: { departments: { linked: 0, created: 0 }, skipped: [] }, toSmarttt: { departments: sent.length, skipped: [] } })
  }),
  http.get(`${API}/admin/smarttt/terms`, () => requireAdmin() ?? ok({ count: smartttAdmin.terms.length, next: null, results: smartttAdmin.terms })),
  http.post(`${API}/admin/smarttt/terms/:termId/set-current`, ({ params }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    smartttAdmin.terms.forEach((t) => { t.is_current = t.id === params.termId })
    return ok({ detail: 'Current term updated.' })
  }),
  http.delete(`${API}/admin/smarttt/terms/:termId/slots`, () => requireAdmin() ?? ok({ detail: 'Deleted 1663 slot(s) for this term.' })),
  http.get(`${API}/admin/smarttt/timetable/uploads`, () => requireAdmin() ?? ok({ count: smartttAdmin.uploads.length, next: null, results: smartttAdmin.uploads })),
  http.post(`${API}/admin/smarttt/timetable/uploads`, () => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    smartttAdmin.uploads.unshift({ id: `upload-${smartttAdmin.uploads.length + 1}`, source_file: 'timetable_uploads/new.pdf', status: 'processed', rows_received: 902, rows_saved: 900, rows_failed: 2, created_at: new Date().toISOString(), uploaded_by_name: adminUser.fullName })
    return ok({ batch_id: smartttAdmin.uploads[0]!.id, status: 'processing' })
  }),
  http.get(`${API}/admin/smarttt/timetable/uploads/:id/status`, ({ params }) =>
    requireAdmin() ?? ok({ upload_batch_id: params.id, status: 'processed', rows_received: 902, rows_saved: 900, rows_failed: 2 })),
  http.delete(`${API}/admin/smarttt/timetable/uploads/:id`, ({ params }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    smartttAdmin.uploads = smartttAdmin.uploads.filter((u) => u.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/admin/smarttt/lecturer-allocation`, () => requireAdmin() ?? ok({ academic_year: '2026/2027', documents: smartttAdmin.allocations })),
  http.post(`${API}/admin/smarttt/lecturer-allocation`, () => requireAdmin() ?? ok({
    detail: 'Saved 3 allocation row(s) from Mathematics.', source: 'Mathematics', academic_year: '2026/2027', awaiting_timetable: false,
    matched: 2, unmatched: 1, slots_updated: 4, conflict_slots: 0,
    results: [
      { unit_code: 'MATH 110', lecturer: 'Dr. Jane Otieno', group: null, programme: 'BSc Mathematics', year_semester: 'Y1S1', slots_assigned: 2, account_linked: true },
      { unit_code: 'MATH 210', lecturer: 'Mr. Collins Mwangi', group: 'GR A', programme: 'BSc Mathematics', year_semester: 'Y2S1', slots_assigned: 2, account_linked: false },
    ],
    not_found: [{ unit_code: 'MATH 999', lecturer: 'Dr. Unknown', reason: 'no such unit in the timetable' }],
    conflicts: [],
  })),
  http.delete(`${API}/admin/smarttt/lecturer-allocation`, ({ request }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const source = new URL(request.url).searchParams.get('source')
    smartttAdmin.allocations = smartttAdmin.allocations.filter((d) => d.source !== source)
    return ok({ detail: `Removed the allocation from ${source}.`, slots_updated: 212 })
  }),
  http.get(`${API}/admin/smarttt/notifications`, () => requireAdmin() ?? ok({ count: smartttAdmin.notifications.length, next: null, results: smartttAdmin.notifications })),
  http.post(`${API}/admin/smarttt/notifications`, async ({ request }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const input = (await request.json()) as { title: string; notification_type: string; target: string }
    smartttAdmin.notifications.unshift({ id: `notif-${smartttAdmin.notifications.length + 1}`, title: input.title, notification_type: input.notification_type, target: input.target, recipients_count: 340, sent_at: new Date().toISOString() })
    return ok({ recipients: 340, push_sent: 290, push_attempted: 300 })
  }),
  http.get(`${API}/admin/smarttt/programs`, () => requireAdmin() ?? ok({ count: smartttAdmin.programs.length, next: null, results: smartttAdmin.programs })),
  http.get(`${API}/admin/smarttt/staff-ids`, () => requireAdmin() ?? ok(smartttAdmin.staffIds)),
  http.post(`${API}/admin/smarttt/staff-ids`, () => requireAdmin() ?? ok({ detail: 'Added 5 staff ID(s); 1 already listed.' })),
  http.delete(`${API}/admin/smarttt/staff-ids/:id`, ({ params }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    smartttAdmin.staffIds = smartttAdmin.staffIds.filter((x) => x.id !== params.id)
    return ok({ detail: 'Staff ID removed.', accounts_disabled: 0 })
  }),
  http.get(`${API}/admin/smarttt/staff-id-uploads`, () => requireAdmin() ?? ok({ uploads: smartttAdmin.staffIdUploads, untracked_ids: 0 })),
  http.delete(`${API}/admin/smarttt/staff-id-uploads/:id`, ({ params }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    smartttAdmin.staffIdUploads = smartttAdmin.staffIdUploads.filter((u) => u.id !== params.id)
    smartttAdmin.staffIds = []
    return ok({ detail: 'Removed 2 staff ID(s) from staff_ids.csv.', removed: 2, accounts_disabled: 1 })
  }),
  http.get(`${API}/admin/smarttt/rooms/capacities`, () => requireAdmin() ?? ok(smartttAdmin.venues)),
  http.post(`${API}/admin/smarttt/rooms/capacities`, () => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    smartttAdmin.venues = { total: 102, confirmed: 101, unconfirmed: 1, unconfirmed_codes: ['STB 4'] }
    return ok({ detail: 'Updated 2 venue(s).', errors: [{ row: 4, code: 'XX 1', error: 'capacity must be a whole number' }], summary: smartttAdmin.venues })
  }),
]

const invitationHandlers = [
  http.post(`${API}/admin/departments`, async ({ request }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const { name, code } = (await request.json()) as { name?: string; code?: string }
    const trimmed = name?.trim() ?? ''
    const upper = code?.trim().toUpperCase() ?? ''
    if (trimmed.length < 3 || !/^[A-Z0-9][A-Z0-9 ./&-]{0,31}$/.test(upper)) return fail(400, 'VALIDATION_FAILED', 'Enter the department name and a code, e.g. DCOMP.')
    // Mirrors directory.service.ts createDepartment: another spelling of an existing department is a duplicate.
    const same = departmentForName(trimmed)
    if (same) return fail(409, 'CONFLICT', `"${trimmed}" is the same department as "${same.name}", which already exists.`)
    const holder = ADMIN_DEPARTMENTS.find((d) => d.code?.toUpperCase() === upper)
    if (holder) return fail(409, 'CONFLICT', `The code ${upper} is already used by ${holder.name}.`)
    const department: AdminDepartment = { departmentId: `dept-${ADMIN_DEPARTMENTS.length + 1}-${upper.toLowerCase()}`, name: trimmed, code: upper, inSmarttt: true, lecturerCount: 0 }
    ADMIN_DEPARTMENTS.push(department)
    return ok({ departmentId: department.departmentId, name: department.name, code: department.code }, 201)
  }),
  http.get(`${API}/admin/officers`, () => requireAdmin() ?? ok(officers)),
  http.get(`${API}/admin/units/pending`, () => requireAdmin() ?? ok(pendingUnits)),
  http.post(`${API}/admin/units/:unitId/verify`, ({ params }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const unit = pendingUnits.find((u) => u.unitId === params.unitId)
    if (!unit) return fail(404, 'NOT_FOUND', 'No such unit.')
    pendingUnits = pendingUnits.filter((u) => u !== unit)
    return ok({ unitId: unit.unitId, code: unit.code, status: 'VERIFIED' })
  }),
  http.post(`${API}/admin/invitations`, async ({ request }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const input = (await request.json()) as { role: 'admin' | 'qa' | 'management' | 'timetabling' | 'department'; fullName: string; email: string; departmentId?: string }
    if (input.role !== 'department') return inviteOfficer(input, { role: input.role, departmentId: null, departmentName: null })
    const department = ADMIN_DEPARTMENTS.find((d) => d.departmentId === input.departmentId)
    if (!department) return fail(400, 'BAD_REQUEST', 'That department does not exist.')
    return inviteOfficer(input, { role: 'department', departmentId: department.departmentId, departmentName: department.name })
  }),
  http.post(`${API}/admin/officers/:userId/resend`, ({ params }) => requireAdmin() ?? resendOfficer(officers.find((o) => o.userId === params.userId))),
  http.post(`${API}/admin/officers/:userId/deactivate`, ({ params }) => requireAdmin() ?? deactivateOfficer(officers.find((o) => o.userId === params.userId))),

  http.post(`${API}/auth/invitations/lookup`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    const officer = officers.find((o) => o.userId === invitations.get(token) && o.status === 'PENDING_VERIFICATION')
    if (!officer) return fail(400, 'BAD_REQUEST', 'This invitation link is invalid, has expired or has already been used. Ask whoever invited you to send it again.')
    const details: InvitationDetails = {
      fullName: officer.fullName, email: officer.email, role: officer.role,
      scopeName: officer.departmentName, expiresAt: officer.invitationExpiresAt!,
      signInUrl: officer.role === 'timetabling' ? 'https://generator.test.local' : null,
    }
    return ok(details)
  }),
  http.post(`${API}/auth/invitations/accept`, async ({ request }) => {
    const { token, password } = (await request.json()) as { token: string; password: string }
    const officer = officers.find((o) => o.userId === invitations.get(token) && o.status === 'PENDING_VERIFICATION')
    if (!officer) return fail(400, 'BAD_REQUEST', 'This invitation link is invalid, has expired or has already been used. Ask whoever invited you to send it again.')
    invitations.delete(token)
    officer.status = 'ACTIVE'
    officer.invitationExpiresAt = null
    const base = { id: officer.userId, fullName: officer.fullName, email: officer.email, status: 'ACTIVE' as const, avatarUrl: null }
    const user: Account = officer.role === 'admin' ? { ...base, role: 'admin' }
      : officer.role === 'management' ? { ...base, role: 'management' }
      : officer.role === 'qa' ? { ...base, role: 'qa', title: null }
      : { ...base, role: 'department', departmentId: officer.departmentId!, departmentName: officer.departmentName! }
    // The timetabling office signs in at the Generator: no account here to sign in with.
    if (officer.role !== 'timetabling') accounts.set(officer.email, { user, password })
    return ok({ email: officer.email, message: 'Your account is ready. Sign in with your email and new password.' })
  }),
  http.post(`${API}/auth/reset-password`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    if (token !== 'valid-reset-token') return fail(400, 'BAD_REQUEST', 'This password reset link is invalid or has expired. Please request a new one.')
    return ok({ message: 'Your password has been changed. You have been signed out everywhere. Please sign in with your new password.' })
  }),
]

// --- Portable terminals and fingerprint enrolment (backend docs/terminals.md) ---

const seedTerminals = (): Terminal[] => [
  {
    id: 'term-1', code: 'CS-TERM-01', label: 'Department office pool', capabilities: ['BARCODE', 'FINGERPRINT'], status: 'ACTIVE',
    pairingExpiresAt: null, pairedAt: '2026-10-01T08:00:00Z', lastSeenAt: new Date().toISOString(), batteryPercent: 82,
    network: 'WIFI', appVersion: '1.0.0', linkedSession: null, createdAt: '2026-10-01T07:55:00Z',
  },
  {
    id: 'term-2', code: 'CS-TERM-02', label: null, capabilities: ['BARCODE'], status: 'PENDING',
    pairingExpiresAt: new Date(Date.now() + 20 * 60_000).toISOString(), pairedAt: null, lastSeenAt: null, batteryPercent: null,
    network: null, appVersion: null, linkedSession: null, createdAt: '2026-10-18T09:00:00Z',
  },
]
let mockTerminals = seedTerminals()
const seedEnrolment = (): EnrolmentStudent[] => DEPARTMENT_EXTRA_STUDENTS.map((st, i) => ({
  registrationNumber: st.registrationNumber, studentUserId: `dept-stu-${i}`, fullName: st.fullName,
  unitCodes: [DEPARTMENT_UNITS.find((u) => u.id === st.unitId)?.code ?? st.unitId],
  fingerprints: i === 0 ? [{ id: 'fp-0', terminalCode: 'CS-TERM-01', label: 'right index', enrolledAt: '2026-10-02T10:00:00Z' }] : [],
  pending: [],
}))
let mockEnrolment = seedEnrolment()
let mockIds = 0
function resetTerminalMocks() { mockTerminals = seedTerminals(); mockEnrolment = seedEnrolment(); mockIds = 0 }
const mockPairingCode = () => `${String(++mockIds).padStart(5, '0')}-ABCDE`
const pairingFor = (t: Terminal) => ({ terminal: t, pairingCode: mockPairingCode(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() })

const terminalHandlers = [
  http.get(`${API}/departments/terminals`, () => requireDepartment() ?? ok(mockTerminals)),

  http.post(`${API}/departments/terminals`, async ({ request }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const body = (await request.json()) as { code: string; label?: string; capabilities: TerminalCapability[] }
    const code = body.code.trim().toUpperCase()
    if (mockTerminals.some((t) => t.code === code)) return fail(409, 'CONFLICT', `A terminal called ${code} already exists. Pick another name.`)
    const terminal: Terminal = {
      id: `term-new-${++mockIds}`, code, label: body.label ?? null, capabilities: [...new Set(body.capabilities)], status: 'PENDING',
      pairingExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), pairedAt: null, lastSeenAt: null, batteryPercent: null,
      network: null, appVersion: null, linkedSession: null, createdAt: new Date().toISOString(),
    }
    mockTerminals = [...mockTerminals, terminal]
    return ok(pairingFor(terminal), 201)
  }),

  http.post(`${API}/departments/terminals/:id/:action`, ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const terminal = mockTerminals.find((t) => t.id === params.id)
    if (!terminal) return fail(404, 'NOT_FOUND', 'Terminal not found.')
    const action = params.action as string
    if (action === 'pairing') {
      if (terminal.status === 'RETIRED') return fail(409, 'CONFLICT', 'This terminal is retired. Add a new one instead.')
      const next: Terminal = { ...terminal, status: 'PENDING', linkedSession: null, pairingExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString() }
      mockTerminals = mockTerminals.map((t) => (t.id === next.id ? next : t))
      return ok(pairingFor(next))
    }
    if (action === 'lost' || action === 'retire') {
      const next: Terminal = { ...terminal, status: action === 'lost' ? 'LOST' : 'RETIRED', linkedSession: null, pairingExpiresAt: null }
      mockTerminals = mockTerminals.map((t) => (t.id === next.id ? next : t))
      return ok(next)
    }
    if (action === 'enrolments') return undefined
    return fail(404, 'NOT_FOUND', 'Not found.')
  }),

  http.post(`${API}/departments/terminals/:id/enrolments`, async ({ params, request }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const terminal = mockTerminals.find((t) => t.id === params.id)
    if (!terminal) return fail(404, 'NOT_FOUND', 'Terminal not found.')
    const { registrationNumber } = (await request.json()) as { registrationNumber: string }
    const student = mockEnrolment.find((st) => st.registrationNumber === registrationNumber.toUpperCase())
    if (!student) return fail(404, 'NOT_FOUND', "No student with that number is on your department's class lists.")
    const commandId = `cmd-${++mockIds}`
    student.pending = [...student.pending, { id: commandId, kind: 'ENROL_FINGERPRINT', terminalCode: terminal.code, label: null, createdAt: new Date().toISOString() }]
    return ok({ commandId, studentUserId: student.studentUserId }, 201)
  }),

  http.get(`${API}/departments/enrolment/students`, ({ request }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase()
    return ok(mockEnrolment.filter((st) => !q || st.registrationNumber.toLowerCase().includes(q) || (st.fullName ?? '').toLowerCase().includes(q)))
  }),

  http.post(`${API}/departments/enrolment/commands/:id/cancel`, ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const student = mockEnrolment.find((st) => st.pending.some((p) => p.id === params.id))
    if (!student) return fail(404, 'NOT_FOUND', 'Request not found.')
    student.pending = student.pending.filter((p) => p.id !== params.id)
    return ok({ cancelled: true })
  }),

  http.delete(`${API}/departments/enrolment/fingerprints/:id`, ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const student = mockEnrolment.find((st) => st.fingerprints.some((f) => f.id === params.id))
    const fingerprint = student?.fingerprints.find((f) => f.id === params.id)
    if (!student || !fingerprint) return fail(404, 'NOT_FOUND', 'Enrolment not found.')
    student.fingerprints = student.fingerprints.filter((f) => f.id !== params.id)
    student.pending = [...student.pending, { id: `cmd-${++mockIds}`, kind: 'DELETE_FINGERPRINT', terminalCode: fingerprint.terminalCode, label: null, createdAt: new Date().toISOString() }]
    return ok({ revoked: true })
  }),

  http.get(`${API}/sessions/:id/terminal-link`, ({ params }) => {
    if (!store.get()) return unauthorized()
    const session = sessions.get(params.id as string)
    if (!session) return fail(404, 'NOT_FOUND', 'Session not found.')
    if (session.status === 'CLOSED') return fail(409, 'CONFLICT', 'This class session has ended.')
    return ok({ linkCode: `ATL1.${session.id}.${Math.floor(Date.now() / 1000) + 300}.mocksignature`, expiresAt: new Date(Date.now() + 300_000).toISOString() })
  }),
]

/* ------------------------------------------------------------------ *
 * Oversight backlog: the attendance policy and exam eligibility,
 * placing lecturers in departments, cross-department allocation, and
 * student course evaluations. Shapes mirror the backend field for field.
 * ------------------------------------------------------------------ */

const POLICY_SEED = (): AttendancePolicy => ({ minAttendancePercent: 75, atRiskMarginPercent: 10, updatedAt: new Date('2026-09-01T08:00:00Z').toISOString(), updatedByName: null })
let attendancePolicy = POLICY_SEED()

/** Every active (student, unit) pair the eligibility reports judge, with classes held and attended. */
const STANDING_SEED: Omit<EligibilityRow, 'attendanceRate' | 'status'>[] = [
  { allocationId: 'al-1', studentUserId: 'stu-1', registrationNumber: 'STU00042', fullName: 'Ama Mensah', unitId: 'u1', unitCode: 'CS301', unitName: 'Data Structures & Algorithms', lecturerName: lecturer.fullName, departmentId: 'dept-cs', departmentName: 'Computer Science', sessionsHeld: 20, sessionsAttended: 19 },
  { allocationId: 'al-2', studentUserId: 'stu-2', registrationNumber: 'SC211/0002/2022', fullName: 'Brian Otieno', unitId: 'u1', unitCode: 'CS301', unitName: 'Data Structures & Algorithms', lecturerName: lecturer.fullName, departmentId: 'dept-cs', departmentName: 'Computer Science', sessionsHeld: 20, sessionsAttended: 14 },
  { allocationId: 'al-3', studentUserId: 'stu-7', registrationNumber: 'SC211/0007/2022', fullName: 'Grace Nyambura Maina', unitId: 'u3', unitCode: 'CS502', unitName: 'Software Engineering Principles', lecturerName: 'Dr. Mary Wambui', departmentId: 'dept-cs', departmentName: 'Computer Science', sessionsHeld: 14, sessionsAttended: 11 },
  { allocationId: 'al-4', studentUserId: 'stu-8', registrationNumber: 'SC211/0008/2022', fullName: 'Hassan Ali Noor', unitId: 'u3', unitCode: 'CS502', unitName: 'Software Engineering Principles', lecturerName: 'Dr. Mary Wambui', departmentId: 'dept-cs', departmentName: 'Computer Science', sessionsHeld: 14, sessionsAttended: 8 },
  { allocationId: 'al-5', studentUserId: 'stu-9', registrationNumber: 'SC211/0009/2023', fullName: 'Irene Chepkoech Lagat', unitId: 'u4', unitCode: 'CS210', unitName: 'Object-Oriented Programming', lecturerName: 'Mr. Peter Njuguna', departmentId: 'dept-se', departmentName: 'Software Engineering', sessionsHeld: 14, sessionsAttended: 12 },
  { allocationId: 'al-6', studentUserId: 'stu-10', registrationNumber: 'SC211/0010/2023', fullName: 'John Mutua Kilonzo', unitId: 'u4', unitCode: 'CS210', unitName: 'Object-Oriented Programming', lecturerName: 'Mr. Peter Njuguna', departmentId: 'dept-se', departmentName: 'Software Engineering', sessionsHeld: 14, sessionsAttended: 10 },
  { allocationId: 'al-7', studentUserId: 'stu-11', registrationNumber: 'SC211/0011/2023', fullName: 'Faith Atieno', unitId: 'u5', unitCode: 'CS410', unitName: 'Distributed Systems', lecturerName: 'Dr. Mary Wambui', departmentId: 'dept-cs', departmentName: 'Computer Science', sessionsHeld: 0, sessionsAttended: 0 },
]

const SEVERITY: Record<EligibilityStatus, number> = { NOT_ELIGIBLE: 0, AT_RISK: 1, NOT_YET_MEASURED: 2, ELIGIBLE: 3 }

/** Mirrors eligibility.service.ts buildReport. */
function eligibilityReport(filter: (r: (typeof STANDING_SEED)[number]) => boolean, all: boolean): EligibilityReport {
  const summary = { total: 0, eligible: 0, atRisk: 0, notEligible: 0, notYetMeasured: 0 }
  const rows: EligibilityRow[] = []
  for (const r of STANDING_SEED.filter(filter)) {
    const percent = r.sessionsHeld > 0 ? (r.sessionsAttended / r.sessionsHeld) * 100 : null
    const status: EligibilityStatus = percent === null ? 'NOT_YET_MEASURED'
      : percent < attendancePolicy.minAttendancePercent ? 'NOT_ELIGIBLE'
        : percent < attendancePolicy.minAttendancePercent + attendancePolicy.atRiskMarginPercent ? 'AT_RISK' : 'ELIGIBLE'
    summary.total += 1
    if (status === 'ELIGIBLE') summary.eligible += 1
    else if (status === 'AT_RISK') summary.atRisk += 1
    else if (status === 'NOT_ELIGIBLE') summary.notEligible += 1
    else summary.notYetMeasured += 1
    if (!all && status !== 'AT_RISK' && status !== 'NOT_ELIGIBLE') continue
    rows.push({ ...r, attendanceRate: percent === null ? null : Math.round(percent * 10) / 10, status })
  }
  rows.sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101))
  return { policy: attendancePolicy, summary, rows }
}

const ADMIN_DEPARTMENTS_SEED = (): AdminDepartment[] => [
  ...DEPARTMENTS_SEED.map((d) => ({ departmentId: d.id, name: d.name, code: d.code, inSmarttt: true, lecturerCount: SEED_LECTURERS.filter((l) => l.departmentId === d.id).length })),
  { departmentId: 'dept-math', name: 'Mathematics', code: 'DMATH', inSmarttt: true, lecturerCount: 1 },
  // Made here before SMARTTT owned departments: the console offers to send it there.
  { departmentId: 'dept-acc', name: 'Accounting', code: 'DACC', inSmarttt: false, lecturerCount: 0 },
  // Created under a second spelling before names were unified — the duplicate the admin Departments page merges.
  { departmentId: 'dept-cs-dup', name: 'Department of Computer Science', code: null, inSmarttt: true, lecturerCount: 1 },
]
let ADMIN_DEPARTMENTS = ADMIN_DEPARTMENTS_SEED()

const ABBREVIATIONS: Record<string, string> = {
  comp: 'computer', cs: 'computer science', sci: 'science', it: 'information technology', info: 'information', tech: 'technology',
  eng: 'engineering', mgt: 'management', mgmt: 'management', admin: 'administration', bus: 'business', econ: 'economics',
  math: 'mathematics', maths: 'mathematics', stats: 'statistics', phys: 'physics', chem: 'chemistry', bio: 'biology', educ: 'education',
}

/** Mirrors department_key() in db/migrations/036_department_spelling.sql. */
const departmentKey = (name: string | null) => {
  const words = (name ?? '').toLowerCase().replace(/&/g, ' and ').replace(/\b([a-z])\.(?=[a-z](\.|\b))/g, '$1')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/^\s*(the\s+)?(department|dept|dpt)\s+(of\s+)?/, '')
    .split(/\s+/).filter(Boolean).map((w) => ABBREVIATIONS[w] ?? w)
  return words.length ? words.join(' ') : null
}

const ALIASES_SEED = (): DepartmentAlias[] => []
let departmentAliases = ALIASES_SEED()

/** Mirrors department_for_name(): canonical name first, then a learned alias. */
const departmentForName = (name: string | null) => {
  const key = departmentKey(name)
  if (!key) return null
  return ADMIN_DEPARTMENTS.find((d) => departmentKey(d.name) === key)
    ?? ADMIN_DEPARTMENTS.find((d) => departmentAliases.some((a) => a.departmentId === d.departmentId && departmentKey(a.alias) === key))
    ?? null
}

const PLACEMENT_SEED = (): PlacementLecturer[] => [
  { userId: 'lec-9', fullName: 'Dr. Samuel Kiprono', staffNumber: 'STF/09001', title: 'Dr.', email: 's.kiprono@university.edu', departmentId: null, departmentName: null, reportedDepartment: 'Comp. Sci & IT', unitCount: 1 },
  { userId: 'lec-10', fullName: 'Ms. Lucy Wanjiku', staffNumber: 'STF/09002', title: 'Ms.', email: 'l.wanjiku@university.edu', departmentId: null, departmentName: null, reportedDepartment: 'Maths', unitCount: 0 },
  ...SEED_LECTURERS.map((l) => ({ userId: l.userId, fullName: l.fullName, staffNumber: l.staffNumber, title: null, email: `${l.userId}@university.edu`, departmentId: l.departmentId, departmentName: l.departmentName, reportedDepartment: l.departmentName, unitCount: l.unitsTaught })),
  { userId: 'lec-4', fullName: 'Dr. Ruth Kamau', staffNumber: 'STF/04112', title: 'Dr.', email: 'r.kamau@university.edu', departmentId: 'dept-math', departmentName: 'Mathematics', reportedDepartment: 'Mathematics', unitCount: 2 },
]
let placementLecturers = PLACEMENT_SEED()

/** Mirrors lecturer.placement.ts listLecturers: unassigned first, then everyone else. */
function listPlacement(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const unassignedOnly = url.searchParams.get('unassigned') === 'true'
  return placementLecturers
    .filter((l) => l.departmentId === null || !unassignedOnly)
    .filter((l) => !q || l.fullName.toLowerCase().includes(q) || l.staffNumber.toLowerCase().includes(q))
    .sort((a, b) => Number(a.departmentId !== null) - Number(b.departmentId !== null) || a.fullName.localeCompare(b.fullName))
}

/** Mirrors lecturer.placement.ts moveLecturer, including learning SMARTTT's spelling from an unassigned lecturer. */
function placeLecturer(lecturer: PlacementLecturer, department: AdminDepartment) {
  const assign = (l: PlacementLecturer) => Object.assign(l, { departmentId: department.departmentId, departmentName: department.name })
  let learnedSpelling: string | null = null
  let alsoPlaced = 0
  if (lecturer.departmentId === null && lecturer.reportedDepartment && departmentKey(lecturer.reportedDepartment) && !departmentForName(lecturer.reportedDepartment)) {
    learnedSpelling = lecturer.reportedDepartment
    departmentAliases.push({
      aliasId: `alias-${departmentAliases.length + 1}`, alias: learnedSpelling, departmentId: department.departmentId, departmentName: department.name,
      source: 'PLACEMENT', createdByName: currentAccount.fullName, createdAt: new Date().toISOString(),
    })
    for (const other of placementLecturers) {
      if (other !== lecturer && other.departmentId === null && departmentForName(other.reportedDepartment)?.departmentId === department.departmentId) { assign(other); alsoPlaced += 1 }
    }
  }
  assign(lecturer)
  const result: PlacementResult = { ...lecturer, learnedSpelling, alsoPlaced }
  return ok(result)
}

// --- Course evaluations ----------------------------------------------------

interface MockRound { id: string; title: string; instructions: string | null; opensAt: string; closesAt: string; minResponses: number; createdAt: string; questions: EvaluationQuestion[] }
interface MockResponse { roundId: string; unitId: string; lecturerName: string; departmentId: string; departmentName: string; answers: { questionId: string; rating?: number; text?: string }[] }

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const questionsFor = (roundId: string): EvaluationQuestion[] => [
  { id: `${roundId}-q1`, position: 1, prompt: 'The lecturer explained the material clearly.', kind: 'RATING', required: true },
  { id: `${roundId}-q2`, position: 2, prompt: 'The unit was well organised and followed its outline.', kind: 'RATING', required: true },
  { id: `${roundId}-q3`, position: 3, prompt: 'What should the lecturer keep doing, or change?', kind: 'TEXT', required: false },
]
const ROUNDS_SEED = (): MockRound[] => [
  { id: 'round-open', title: 'Semester 1 2026/27 evaluation', instructions: 'Your answers are anonymous.', opensAt: daysFromNow(-3), closesAt: daysFromNow(11), minResponses: 3, createdAt: daysFromNow(-4), questions: questionsFor('round-open') },
  { id: 'round-old', title: 'Semester 2 2025/26 evaluation', instructions: null, opensAt: daysFromNow(-200), closesAt: daysFromNow(-186), minResponses: 3, createdAt: daysFromNow(-201), questions: questionsFor('round-old') },
]
const cs301 = { unitId: 'u1', lecturerName: lecturer.fullName, departmentId: 'dept-cs', departmentName: 'Computer Science' }
const RESPONSES_SEED = (): MockResponse[] => [
  ...[[5, 4, 'Clear examples every week.'], [4, 4, undefined], [3, 2, 'Notes came out late.'], [5, 5, undefined]].map(([a, b, text]) => ({
    roundId: 'round-open', ...cs301, answers: [{ questionId: 'round-open-q1', rating: a as number }, { questionId: 'round-open-q2', rating: b as number }, ...(text ? [{ questionId: 'round-open-q3', text: text as string }] : [])],
  })),
  // One response only: below the minimum, so its ratings are withheld.
  { roundId: 'round-open', unitId: 'u3', lecturerName: 'Dr. Mary Wambui', departmentId: 'dept-cs', departmentName: 'Computer Science', answers: [{ questionId: 'round-open-q1', rating: 2 }, { questionId: 'round-open-q2', rating: 3 }] },
  ...[4, 5, 4].map((a) => ({ roundId: 'round-old', unitId: 'u4', lecturerName: 'Mr. Peter Njuguna', departmentId: 'dept-se', departmentName: 'Software Engineering', answers: [{ questionId: 'round-old-q1', rating: a }, { questionId: 'round-old-q2', rating: a }] })),
]
let evaluationRounds = ROUNDS_SEED()
let evaluationResponses = RESPONSES_SEED()
/** `${roundId}:${unitId}:${studentId}` — who has evaluated what, never joined to the responses. */
const evaluationSubmissions = new Set<string>()
let roundSeq = 0

const roundStatus = (r: MockRound): EvaluationRoundStatus => (Date.now() < Date.parse(r.opensAt) ? 'UPCOMING' : Date.now() < Date.parse(r.closesAt) ? 'OPEN' : 'CLOSED')
const toRound = (r: MockRound): EvaluationRound => ({
  id: r.id, title: r.title, instructions: r.instructions, opensAt: r.opensAt, closesAt: r.closesAt, status: roundStatus(r),
  minResponses: r.minResponses, questionCount: r.questions.length, responseCount: evaluationResponses.filter((x) => x.roundId === r.id).length, createdAt: r.createdAt,
})
const hasAnswers = (roundId: string) => evaluationResponses.some((x) => x.roundId === roundId)
const toRoundDetail = (r: MockRound): EvaluationRoundDetail => ({ ...toRound(r), questions: r.questions, questionsEditable: !hasAnswers(r.id) })

function aggregate(responses: MockResponse[], questions: EvaluationQuestion[]): EvaluationQuestionResult[] {
  return questions.filter((q) => q.kind === 'RATING').flatMap((q) => {
    const ratings = responses.flatMap((r) => r.answers.filter((a) => a.questionId === q.id && a.rating).map((a) => a.rating!))
    if (ratings.length === 0) return []
    const distribution = [1, 2, 3, 4, 5].map((n) => ratings.filter((x) => x === n).length) as [number, number, number, number, number]
    return [{ questionId: q.id, answered: ratings.length, average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100, distribution }]
  })
}

/** Mirrors evaluation.service.ts getResults. */
function evaluationResults(round: MockRound, inScope: (r: MockResponse) => boolean): EvaluationResults {
  const responses = evaluationResponses.filter((r) => r.roundId === round.id && inScope(r))
  const groups = new Map<string, MockResponse[]>()
  for (const r of responses) groups.set(`${r.unitId}:${r.lecturerName}`, [...(groups.get(`${r.unitId}:${r.lecturerName}`) ?? []), r])
  const unitResults: EvaluationUnitResult[] = [...groups.values()].map((list) => {
    const first = list[0]!
    const unit = DEPARTMENT_UNITS.find((u) => u.id === first.unitId)
    const enrolled = unit?.studentCount ?? 0
    const reportable = list.length >= round.minResponses
    return {
      unitId: first.unitId, unitCode: unit?.code ?? first.unitId, unitName: unit?.name ?? null, lecturerName: first.lecturerName,
      departmentId: first.departmentId, departmentName: first.departmentName, responses: list.length, enrolled,
      responseRate: enrolled ? Math.round((list.length / enrolled) * 1000) / 10 : null, reportable,
      ratings: reportable ? aggregate(list, round.questions) : [],
      comments: reportable ? list.flatMap((r) => r.answers.filter((a) => a.text).map((a) => ({ questionId: a.questionId, text: a.text! }))).sort((a, b) => a.text.localeCompare(b.text)) : [],
    }
  })
  return { round: toRoundDetail(round), totalResponses: responses.length, overall: responses.length >= round.minResponses ? aggregate(responses, round.questions) : [], units: unitResults }
}

function resetOversightMocks() {
  attendancePolicy = POLICY_SEED()
  placementLecturers = PLACEMENT_SEED()
  ADMIN_DEPARTMENTS = ADMIN_DEPARTMENTS_SEED()
  departmentAliases = ALIASES_SEED()
  evaluationRounds = ROUNDS_SEED()
  evaluationResponses = RESPONSES_SEED()
  evaluationSubmissions.clear()
}

const requireStudent = () => {
  if (!store.get()) return unauthorized()
  if (currentAccount.role !== 'student') return fail(403, 'FORBIDDEN', 'Forbidden')
  return null
}

const findRound = (id: unknown) => evaluationRounds.find((r) => r.id === id)

const oversightHandlers = [
  http.get(`${API}/attendance-policy`, () => (store.get() ? ok(attendancePolicy) : unauthorized())),
  http.get(`${API}/quality-assurance/attendance-policy`, () => requireQa() ?? ok(attendancePolicy)),
  http.put(`${API}/quality-assurance/attendance-policy`, async ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const input = (await request.json()) as { minAttendancePercent?: number; atRiskMarginPercent?: number }
    const min = input.minAttendancePercent ?? attendancePolicy.minAttendancePercent
    const margin = input.atRiskMarginPercent ?? attendancePolicy.atRiskMarginPercent
    if (min < 1 || min > 100 || margin < 0 || margin > 50) return fail(400, 'VALIDATION_FAILED', 'Out of range.')
    attendancePolicy = { minAttendancePercent: min, atRiskMarginPercent: margin, updatedAt: new Date().toISOString(), updatedByName: currentAccount.fullName }
    return ok(attendancePolicy)
  }),

  http.get(`${API}/departments/eligibility`, ({ request }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const officer = currentAccount as DepartmentOfficer
    return ok(eligibilityReport((r) => r.departmentId === officer.departmentId, new URL(request.url).searchParams.get('all') === 'true'))
  }),
  http.get(`${API}/quality-assurance/eligibility`, ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const url = new URL(request.url)
    const departmentId = url.searchParams.get('departmentId')
    return ok(eligibilityReport((r) => !departmentId || r.departmentId === departmentId, url.searchParams.get('all') === 'true'))
  }),

  http.get(`${API}/admin/departments`, () => requireAdmin() ?? ok(ADMIN_DEPARTMENTS)),
  http.get(`${API}/admin/department-aliases`, () => requireAdmin() ?? ok(departmentAliases)),
  http.delete(`${API}/admin/department-aliases/:aliasId`, ({ params }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    if (!departmentAliases.some((a) => a.aliasId === params.aliasId)) return fail(404, 'NOT_FOUND', 'No such spelling.')
    departmentAliases = departmentAliases.filter((a) => a.aliasId !== params.aliasId)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/admin/department-duplicates`, () => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const groups = new Map<string, DuplicateDepartment[]>()
    for (const d of ADMIN_DEPARTMENTS) {
      const key = departmentKey(d.name)!
      groups.set(key, [...(groups.get(key) ?? []), { departmentId: d.departmentId, name: d.name, code: d.code, lecturerCount: d.lecturerCount, unitCount: 0 }])
    }
    return ok([...groups.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => b.lecturerCount - a.lecturerCount)))
  }),
  http.post(`${API}/admin/departments/:departmentId/merge`, async ({ params, request }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const { intoDepartmentId } = (await request.json()) as { intoDepartmentId: string }
    const duplicate = ADMIN_DEPARTMENTS.find((d) => d.departmentId === params.departmentId)
    const keep = ADMIN_DEPARTMENTS.find((d) => d.departmentId === intoDepartmentId)
    if (!duplicate) return fail(404, 'NOT_FOUND', 'No such department.')
    if (!keep || keep === duplicate) return fail(400, 'BAD_REQUEST', 'Choose a different department to keep.')
    keep.lecturerCount += duplicate.lecturerCount
    ADMIN_DEPARTMENTS = ADMIN_DEPARTMENTS.filter((d) => d !== duplicate)
    if (departmentKey(duplicate.name) !== departmentKey(keep.name)) {
      departmentAliases.push({ aliasId: `alias-${departmentAliases.length + 1}`, alias: duplicate.name, departmentId: keep.departmentId, departmentName: keep.name, source: 'MERGE', createdByName: currentAccount.fullName, createdAt: new Date().toISOString() })
    }
    return ok({ departmentId: keep.departmentId, name: keep.name })
  }),
  http.get(`${API}/admin/lecturers`, ({ request }) => requireAdmin() ?? ok(listPlacement(request))),
  http.patch(`${API}/admin/lecturers/:lecturerUserId/department`, async ({ params, request }) => {
    const blocked = requireAdmin()
    if (blocked) return blocked
    const lecturer = placementLecturers.find((l) => l.userId === params.lecturerUserId)
    if (!lecturer) return fail(404, 'NOT_FOUND', 'No such lecturer.')
    const { departmentId } = (await request.json()) as { departmentId: string }
    const department = ADMIN_DEPARTMENTS.find((d) => d.departmentId === departmentId)
    if (!department) return fail(400, 'BAD_REQUEST', 'That department does not exist.')
    return placeLecturer(lecturer, department)
  }),

  // QA: evaluation rounds
  http.get(`${API}/quality-assurance/evaluations`, () => requireQa() ?? ok([...evaluationRounds].sort((a, b) => b.opensAt.localeCompare(a.opensAt)).map(toRound))),
  http.post(`${API}/quality-assurance/evaluations`, async ({ request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const input = (await request.json()) as EvaluationRoundInput
    if (Date.parse(input.closesAt) <= Date.parse(input.opensAt)) return fail(400, 'VALIDATION_FAILED', 'The round must close after it opens.')
    const id = `round-${++roundSeq}`
    const round: MockRound = {
      id, title: input.title, instructions: input.instructions ?? null, opensAt: input.opensAt, closesAt: input.closesAt,
      minResponses: input.minResponses ?? 3, createdAt: new Date().toISOString(),
      questions: input.questions.map((q, i) => ({ ...q, id: `${id}-q${i + 1}`, position: i + 1 })),
    }
    evaluationRounds.push(round)
    return ok(toRoundDetail(round), 201)
  }),
  http.get(`${API}/quality-assurance/evaluations/:id`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const round = findRound(params.id)
    return round ? ok(toRoundDetail(round)) : fail(404, 'NOT_FOUND', 'No such evaluation round.')
  }),
  http.patch(`${API}/quality-assurance/evaluations/:id`, async ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const round = findRound(params.id)
    if (!round) return fail(404, 'NOT_FOUND', 'No such evaluation round.')
    const input = (await request.json()) as Partial<EvaluationRoundInput>
    if (input.questions && hasAnswers(round.id)) return fail(409, 'CONFLICT', 'Students have already answered this round, so its questions can no longer change.')
    if (input.title) round.title = input.title
    if (input.instructions !== undefined) round.instructions = input.instructions || null
    if (input.opensAt) round.opensAt = input.opensAt
    if (input.closesAt) round.closesAt = input.closesAt
    if (input.minResponses) round.minResponses = input.minResponses
    if (input.questions) round.questions = input.questions.map((q, i) => ({ ...q, id: `${round.id}-e${roundSeq}-${i + 1}`, position: i + 1 }))
    return ok(toRoundDetail(round))
  }),
  http.post(`${API}/quality-assurance/evaluations/:id/close`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const round = findRound(params.id)
    if (!round) return fail(404, 'NOT_FOUND', 'No such evaluation round.')
    if (roundStatus(round) !== 'CLOSED') {
      round.closesAt = new Date().toISOString()
      if (Date.parse(round.opensAt) >= Date.now()) round.opensAt = new Date(Date.now() - 1000).toISOString()
    }
    return ok(toRoundDetail(round))
  }),
  http.delete(`${API}/quality-assurance/evaluations/:id`, ({ params }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const round = findRound(params.id)
    if (!round) return fail(404, 'NOT_FOUND', 'No such evaluation round.')
    if (hasAnswers(round.id)) return fail(409, 'CONFLICT', 'Students have already answered this round. Close it instead of deleting it.')
    evaluationRounds = evaluationRounds.filter((r) => r.id !== round.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/quality-assurance/evaluations/:id/results`, ({ params, request }) => {
    const blocked = requireQa()
    if (blocked) return blocked
    const round = findRound(params.id)
    if (!round) return fail(404, 'NOT_FOUND', 'No such evaluation round.')
    const url = new URL(request.url)
    const departmentId = url.searchParams.get('departmentId')
    return ok(evaluationResults(round, (r) => !departmentId || r.departmentId === departmentId))
  }),

  // Department: started rounds and their own results
  http.get(`${API}/departments/evaluations`, () => requireDepartment() ?? ok(evaluationRounds.filter((r) => roundStatus(r) !== 'UPCOMING').map(toRound))),
  http.get(`${API}/departments/evaluations/:id`, ({ params }) => {
    const blocked = requireDepartment()
    if (blocked) return blocked
    const round = findRound(params.id)
    if (!round || roundStatus(round) === 'UPCOMING') return fail(404, 'NOT_FOUND', 'No such evaluation round.')
    const officer = currentAccount as DepartmentOfficer
    return ok(evaluationResults(round, (r) => r.departmentId === officer.departmentId))
  }),
  // Students
  http.get(`${API}/students/me/evaluations`, () => {
    const blocked = requireStudent()
    if (blocked) return blocked
    const studentId = currentAccount.id
    const rounds: StudentEvaluationRound[] = evaluationRounds.filter((r) => roundStatus(r) === 'OPEN').map((r) => ({
      id: r.id, title: r.title, instructions: r.instructions, closesAt: r.closesAt, questions: r.questions,
      units: STUDENT_UNIT_IDS.map((unitId) => {
        const unit = units.find((u) => u.id === unitId)!
        return { unitId, unitCode: unit.code, unitName: unit.name, lecturerName: lecturer.fullName, submitted: evaluationSubmissions.has(`${r.id}:${unitId}:${studentId}`) }
      }),
    }))
    return ok(rounds)
  }),
  http.post(`${API}/students/me/evaluations/:roundId/units/:unitId`, async ({ params, request }) => {
    const blocked = requireStudent()
    if (blocked) return blocked
    const round = findRound(params.roundId)
    if (!round || roundStatus(round) !== 'OPEN') return fail(404, 'NOT_FOUND', 'This evaluation is not open.')
    const unitId = String(params.unitId)
    if (!STUDENT_UNIT_IDS.includes(unitId)) return fail(404, 'NOT_FOUND', 'You are not on that unit.')
    const key = `${round.id}:${unitId}:${currentAccount.id}`
    if (evaluationSubmissions.has(key)) return fail(409, 'CONFLICT', 'You have already evaluated this unit in this round.')
    const { answers } = (await request.json()) as { answers: { questionId: string; rating?: number; text?: string }[] }
    const missing = round.questions.find((q) => q.required && !answers.some((a) => a.questionId === q.id))
    if (missing) return fail(400, 'BAD_REQUEST', `Please answer "${missing.prompt}".`)
    evaluationSubmissions.add(key)
    evaluationResponses.push({ roundId: round.id, unitId, lecturerName: lecturer.fullName, departmentId: 'dept-cs', departmentName: 'Computer Science', answers })
    return new HttpResponse(null, { status: 204 })
  }),
]

export const handlers = [...terminalHandlers, ...authHandlers, ...smartttAdminHandlers, ...invitationHandlers, overviewHandler, recentSessionsHandler, studentsHandler, ...departmentHandlers, ...managementHandlers, ...qaHandlers, ...oversightHandlers, ...dataHandlers, ...liveHandlers, ...faceHandlers]

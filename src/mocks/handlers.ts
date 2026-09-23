import { delay, http, HttpResponse } from 'msw'
import type { AttendanceSession, CreateSessionInput, Lecturer, Overview, RecentSession, Unit } from '@/types'

// Mocks follow the same base URL as the client, so the two can never disagree.
const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
const SESSION_FLAG = 'mock-auth'

const lecturer: Lecturer = {
  id: 'lec-1',
  role: 'lecturer',
  fullName: 'Dr. Joseph K. Osei',
  email: 'j.osei@university.edu',
  staffNumber: 'LEC00123',
  title: 'Dr.',
  department: 'Computer Science',
}

const student: Lecturer = {
  id: 'stu-1',
  role: 'student',
  fullName: 'Ama Mensah',
  email: 'a.mensah@student.university.edu',
  staffNumber: 'STU00042',
  title: '',
  department: 'BSc Computer Science',
}

const accounts = new Map<string, { user: Lecturer; password: string }>([
  [lecturer.staffNumber.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.staffNumber.toLowerCase(), { user: student, password: 'password' }],
  [lecturer.email.toLowerCase(), { user: lecturer, password: 'password' }],
  [student.email.toLowerCase(), { user: student, password: 'password' }],
])

const units: Unit[] = [
  { id: 'u1', code: 'CS301', name: 'Data Structures & Algorithms', studentCount: 92 },
  { id: 'u2', code: 'CS305', name: 'Operating Systems', studentCount: 81 },
  { id: 'u3', code: 'CS312', name: 'Database Systems', studentCount: 74 },
  { id: 'u4', code: 'CS420', name: 'Software Engineering', studentCount: 66 },
]

const store = (() => {
  let memory = false
  return {
    // VITE_USE_MOCKS=data: sign-in is real (handled by the backend); only the dashboard/session
    // data below is mocked, so it trusts the real session instead of the mock login flag.
    get: () => import.meta.env.VITE_USE_MOCKS === 'data' || (typeof sessionStorage === 'undefined' ? memory : sessionStorage.getItem(SESSION_FLAG) === '1'),
    set: (v: boolean) => (typeof sessionStorage === 'undefined' ? (memory = v) : v ? sessionStorage.setItem(SESSION_FLAG, '1') : sessionStorage.removeItem(SESSION_FLAG)),
  }
})()

let currentAccount: Lecturer = lecturer

const sessions = new Map<string, AttendanceSession>()
const token = () => `att.${crypto.randomUUID()}.${Date.now()}`
const unauthorized = () => HttpResponse.json({ message: 'Not signed in' }, { status: 401 })

/** Test helper: back to a signed-out, empty server. */
export const resetMocks = () => {
  store.set(false)
  currentAccount = lecturer
  sessions.clear()
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
  http.patch(`${API}/auth/me`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as { email?: string; fullName?: string; title?: string; department?: string }
    if (!input.email?.trim() || !input.fullName?.trim() || !input.department?.trim()) {
      return HttpResponse.json({ message: 'Name, email and department are required.' }, { status: 422 })
    }
    Object.assign(currentAccount, {
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      title: input.title?.trim() ?? '',
      department: input.department.trim(),
    })
    return HttpResponse.json(currentAccount)
  }),
  // Mock sessions never expire, so there is never anything to refresh.
  http.post(`${API}/auth/refresh`, unauthorized),
]

export const dataHandlers = [
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
    return HttpResponse.json(overview)
  }),
  http.get(`${API}/lecturer/units`, () => (store.get() ? HttpResponse.json(units) : unauthorized())),

  http.get(`${API}/lecturer/sessions/recent`, async () => {
    if (!store.get()) return unauthorized()
    await delay(200)
    const recent: RecentSession[] = [
      { id: 's1', date: '2026-09-07T08:00:00Z', unitCode: 'CS301', present: 78, total: 87, reference: 'QR-CS301-0908' },
      { id: 's2', date: '2026-09-07T11:00:00Z', unitCode: 'CS405', present: 61, total: 64, reference: 'QR-CS405-0908' },
      { id: 's3', date: '2026-09-04T09:00:00Z', unitCode: 'CS502', present: 47, total: 52, reference: 'QR-CS502-0905' },
    ]
    return HttpResponse.json(recent)
  }),

  http.post(`${API}/sessions`, async ({ request }) => {
    if (!store.get()) return unauthorized()
    const input = (await request.json()) as CreateSessionInput
    await delay(300)
    if (!units.some((u) => u.id === input.unitId)) return HttpResponse.json({ message: 'Unit not found' }, { status: 404 })
    const now = Date.now()
    const s: AttendanceSession = {
      id: crypto.randomUUID(),
      unitId: input.unitId,
      qrToken: token(),
      status: 'open',
      startsAt: new Date(now).toISOString(),
      expiresAt: new Date(now + input.durationMinutes * 60_000).toISOString(),
      verificationMethods: input.verificationMethods,
    }
    sessions.set(s.id, s)
    return HttpResponse.json(s, { status: 201 })
  }),
  http.post(`${API}/sessions/:id/refresh`, ({ params }) => {
    const s = sessions.get(params.id as string)
    if (!s || s.status !== 'open') return HttpResponse.json({ message: 'Session is not open' }, { status: 409 })
    const next = { ...s, qrToken: token() }
    sessions.set(s.id, next)
    return HttpResponse.json(next)
  }),
  http.post(`${API}/sessions/:id/close`, ({ params }) => {
    const s = sessions.get(params.id as string)
    if (!s) return HttpResponse.json({ message: 'Session not found' }, { status: 404 })
    const next = { ...s, status: 'closed' as const }
    sessions.set(s.id, next)
    return HttpResponse.json(next)
  }),
]

export const handlers = [...authHandlers, ...dataHandlers]

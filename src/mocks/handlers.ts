import { delay, http, HttpResponse } from 'msw'
import type { AttendanceSession, CreateSessionInput, Lecturer, Overview, RecentSession, Unit } from '@/types'

const API = '/api'
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

const units: Unit[] = [
  { id: 'u1', code: 'CS301', name: 'Data Structures & Algorithms', studentCount: 92 },
  { id: 'u2', code: 'CS305', name: 'Operating Systems', studentCount: 81 },
  { id: 'u3', code: 'CS312', name: 'Database Systems', studentCount: 74 },
  { id: 'u4', code: 'CS420', name: 'Software Engineering', studentCount: 66 },
]

const store = (() => {
  let memory = false
  return {
    get: () => (typeof sessionStorage === 'undefined' ? memory : sessionStorage.getItem(SESSION_FLAG) === '1'),
    set: (v: boolean) => (typeof sessionStorage === 'undefined' ? (memory = v) : v ? sessionStorage.setItem(SESSION_FLAG, '1') : sessionStorage.removeItem(SESSION_FLAG)),
  }
})()

const sessions = new Map<string, AttendanceSession>()
const token = () => `att.${crypto.randomUUID()}.${Date.now()}`
const unauthorized = () => HttpResponse.json({ message: 'Not signed in' }, { status: 401 })

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const { identifier, password } = (await request.json()) as { identifier: string; password: string }
    await delay(300)
    const ok = [lecturer.email, lecturer.staffNumber].includes(identifier) && password === 'password'
    if (!ok) return HttpResponse.json({ message: 'Invalid staff number/email or password' }, { status: 401 })
    store.set(true)
    return HttpResponse.json(lecturer)
  }),
  http.post(`${API}/auth/logout`, () => {
    store.set(false)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/auth/me`, () => (store.get() ? HttpResponse.json(lecturer) : unauthorized())),

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

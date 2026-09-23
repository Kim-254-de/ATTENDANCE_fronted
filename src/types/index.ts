export interface Lecturer {
  id: string
  role: 'lecturer' | 'student' | 'admin'
  fullName: string
  email: string
  staffNumber: string
  title: string
  department: string
}

export interface Unit {
  id: string
  code: string
  name: string
  studentCount: number
  creditHours: number
  attendanceRate: number // 0–100, semester-to-date average for this unit
}

export interface Overview {
  totalStudents: number
  unitsTaught: number
  avgAttendance: number // 0–100
  sessionsHeld: number
  periodLabel: string
  erpSync: { status: 'synced' | 'syncing' | 'failed'; lastSyncedAt: string }
}

export type SessionStatus = 'OPEN' | 'PAUSED' | 'CLOSED'

/** A class meeting. One row for the whole class, however long it runs — the QR rotates without writing anything new. */
export interface SessionSummary {
  id: string
  unitId: string
  unitCode: string
  unitName: string | null
  title: string | null
  status: SessionStatus
  opensAt: string
  closesAt: string
  rotationSeconds: number
}

/** The code to show right now, plus when it next changes. */
export interface CurrentQr {
  session: SessionSummary
  payload: string
  expiresInSeconds: number
  rotatesAt: string
  /** Students recorded present so far this session. */
  checkedIn: number
}

export interface CreateSessionInput {
  unitId: string
  title?: string
  closesAt: string
  rotationSeconds?: number
}

export interface ApiErrorEnvelope {
  success: false
  error: { code: string; message: string; details?: unknown }
  requestId?: string
}

export interface RecentSession {
  id: string
  date: string // ISO
  unitCode: string
  present: number
  total: number
  reference: string // attendance reference number, e.g. QR-CS301-0908
}

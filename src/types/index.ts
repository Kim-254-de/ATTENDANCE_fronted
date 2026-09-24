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
  /** Students active on the unit, i.e. who could check in. */
  enrolled: number
}

/** Who has checked in to a session, most recent first. */
export interface SessionAttendance {
  sessionId: string
  checkedIn: number
  attendees: {
    id: string
    studentUserId: string
    fullName: string
    registrationNumber: string | null
    recordedAt: string
  }[]
}

/** A unit the signed-in lecturer teaches, as the backend holds it. */
export interface TaughtUnit {
  id: string
  code: string
  name: string | null
  /** Students who can check in. */
  studentCount: number
  /** Students who asked to join and are waiting for approval. */
  pendingCount: number
  createdAt: string
}

export interface CreateUnitInput {
  code: string
  name: string
}

export type AllocationStatus = 'ACTIVE' | 'PENDING' | 'DROPPED'

/** A student on a unit. */
export interface Allocation {
  id: string
  registrationNumber: string | null
  studentUserId: string | null
  fullName: string | null
  status: AllocationStatus
  source: 'LECTURER' | 'SELF_ENROLLED'
  /** False until the student registers — they are on the list but cannot sign in to check in yet. */
  hasAccount: boolean
  createdAt: string
}

export type AllocationResultStatus = 'ADDED' | 'RESTORED' | 'ALREADY_ALLOCATED' | 'NOT_FOUND' | 'INACTIVE' | 'UNAVAILABLE'

/** What happened to one registration number in a bulk add. */
export interface AllocationResult {
  registrationNumber: string
  status: AllocationResultStatus
  fullName: string | null
}

export interface CreateSessionInput {
  unitId: string
  title?: string
  closesAt: string
  rotationSeconds?: number
}

export interface ApiErrorBody {
  message: string
  code?: string
  details?: { field: string; message: string }[]
}

export interface RegistrationInput {
  fullName: string
  email: string
  staffNumber: string
  password: string
  confirmPassword: string
}

export interface RegistrationResult {
  id: string
  fullName: string
  email: string
  staffNumber: string
  status: string
  nextStep: string
  message: string
}

export interface EmailVerificationResult {
  status: string
  nextStep: 'AWAIT_APPROVAL' | 'SIGN_IN' | string
  message: string
}

export interface RecentSession {
  id: string
  date: string // ISO
  unitCode: string
  present: number
  total: number
  reference: string // attendance reference number, e.g. QR-CS301-0908
}

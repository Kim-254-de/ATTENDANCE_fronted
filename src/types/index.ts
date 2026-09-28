export type AccountStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export interface Lecturer {
  id: string
  role: 'lecturer'
  fullName: string
  email: string
  staffNumber: string
  title: string
  department: string
  status: AccountStatus
  /** Only present on /auth/me — deliberately left off the lighter session-auth payloads. */
  avatarUrl: string | null
}

/** A signed-in student, as GET /auth/me and sign-in return them. */
export interface Student {
  id: string
  role: 'student'
  fullName: string
  email: string
  /** e.g. EBT1/08223/23 — what puts them on unit rosters. */
  registrationNumber: string
  programme: string | null
  yearOfStudy: number | null
  status: AccountStatus
  avatarUrl: string | null
}

/** Whoever is signed in. Check `role` before using lecturer- or student-only fields. */
export type Account = Lecturer | Student

/** POST /auth/student/register */
export interface StudentRegistrationInput {
  fullName: string
  email: string
  registrationNumber: string
  password: string
  confirmPassword: string
}

export interface StudentRegistrationResult {
  id: string
  fullName: string
  email: string
  registrationNumber: string
  status: AccountStatus
  nextStep: 'VERIFY_EMAIL'
  createdAt: string
  message: string
}

/** GET /students/me/units: a unit the student is on, with their attendance in it. */
export interface StudentUnit {
  id: string
  /** The class: "COSC 103 GR A", or "COSC 103" when not split into groups. */
  code: string
  name: string | null
  baseCode: string | null
  group: string | null
  lecturerName: string
  schedule: UnitSchedule | null
  sessionsHeld: number
  sessionsAttended: number
  /** 0–100, one decimal; null until a session has been held. */
  attendanceRate: number | null
}

/** PRESENT: checked in. OPEN: still taking check-ins (not an absence yet). ABSENT: over, no check-in. */
export type AttendanceMark = 'PRESENT' | 'OPEN' | 'ABSENT'

export interface StudentAttendanceRecord {
  sessionId: string
  unitId: string
  unitCode: string
  unitName: string | null
  title: string | null
  opensAt: string
  closesAt: string
  mark: AttendanceMark
  recordedAt: string | null
}

/** GET /students/me/attendance */
export interface StudentAttendance {
  summary: { sessionsHeld: number; attended: number; attendanceRate: number | null }
  records: StudentAttendanceRecord[]
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

/** The unit's issued weekly meeting slot. 0=Sunday..6=Saturday, matches JS Date#getDay(). */
export interface UnitSchedule {
  dayOfWeek: number
  startTime: string // "HH:MM", 24h
  endTime: string
}

/**
 * A unit's existence and schedule are checked automatically against the ERP's
 * issued timetable when a lecturer adds it (unit code only — no free-text
 * name/schedule). PENDING_VERIFICATION means the timetable doesn't list this
 * lecturer as the one assigned to teach it, so an admin must confirm that
 * assignment by hand before a class can be activated for it.
 */
export type UnitVerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED'

/** A unit the signed-in lecturer teaches, as the backend holds it. */
export interface TaughtUnit {
  id: string
  code: string
  name: string | null
  /** Students who can check in. */
  studentCount: number
  /** Legacy: nothing creates a pending allocation now that rosters come from the ERP. */
  pendingCount: number
  createdAt: string
  /** Null only for units created before schedules existed. */
  schedule: UnitSchedule | null
  status: UnitVerificationStatus
  /** The unit this class belongs to ("COSC 103" for "COSC 103 GR A"); null for units only added by code. */
  baseCode: string | null
  /** The teaching group ("GR A") when the unit is split into groups taught by different lecturers; null otherwise. */
  group: string | null
  /** Students registered for this class this term, per the timetable system (SMARTTT). Null if it has never reported the unit. */
  registeredStudents: number | null
  /** For a group: registered students who haven't picked a group on the timetable yet, so are on no group's roster. */
  studentsWithoutGroup: number | null
  /** When the timetable last confirmed the unit; null for a unit only ever added by code. */
  timetableSyncedAt: string | null
}

/** The name and schedule are never typed in — the backend fills them in from the ERP's course record. */
export interface CreateUnitInput {
  code: string
}

export type AllocationStatus = 'ACTIVE' | 'PENDING' | 'DROPPED'

/**
 * A student on a unit, as synced from the timetable system (SMARTTT), or from
 * the ERP where SMARTTT isn't configured. `PENDING`, `LECTURER` and
 * `SELF_ENROLLED` only ever appear on rows written before rosters were synced.
 */
export interface Allocation {
  id: string
  registrationNumber: string | null
  studentUserId: string | null
  fullName: string | null
  status: AllocationStatus
  source: 'SMARTTT' | 'ERP' | 'LECTURER' | 'SELF_ENROLLED'
  /** False until the student registers — they are on the list but cannot sign in to check in yet. */
  hasAccount: boolean
  createdAt: string
}

export interface CreateSessionInput {
  unitId: string
  title?: string
  /** Omitted for a unit with an issued schedule — the backend derives it from the slot's end time. */
  closesAt?: string
  rotationSeconds?: number
}

/** A student's check-in, as POST /attendance/check-in returns it once a scanned code verifies. */
export interface CheckInResult {
  recordId: string
  sessionId: string
  /** The class checked in to, e.g. "COSC 103 GR A". */
  unitCode: string
  recordedAt: string
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

/** One row from GET /reports/sessions — the Dashboard's "Recent Sessions" and the Attendance page's full log both use this shape. */
export interface RecentSession {
  id: string
  date: string // ISO
  unitId: string
  unitCode: string
  unitName: string | null
  present: number
  absent: number
  total: number
  rate: number // 0–100
  reference: string // display-only, derived — not stored under this name; e.g. QR-CS301-0908
}

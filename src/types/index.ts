export type VerificationMethod = 'qr' | 'fingerprint' | 'rfid' | 'face'

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
}

export interface Overview {
  totalStudents: number
  unitsTaught: number
  avgAttendance: number // 0–100
  sessionsHeld: number
  periodLabel: string
  erpSync: { status: 'synced' | 'syncing' | 'failed'; lastSyncedAt: string }
}

export interface AttendanceSession {
  id: string
  unitId: string
  qrToken: string
  status: 'open' | 'paused' | 'closed'
  startsAt: string
  expiresAt: string
  verificationMethods: VerificationMethod[]
}

export interface CreateSessionInput {
  unitId: string
  durationMinutes: number
  verificationMethods: VerificationMethod[]
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

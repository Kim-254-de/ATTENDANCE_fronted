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

/**
 * A signed-in department officer: oversees every lecturer, unit and student in
 * one department, read-only. Not self-registered — the backend provisions these.
 */
export interface DepartmentOfficer {
  id: string
  role: 'department'
  fullName: string
  email: string
  departmentId: string
  departmentName: string
  status: AccountStatus
  avatarUrl: string | null
}

/** A signed-in member of management: attendance across every department in the university, read-only. */
export interface ManagementAccount {
  id: string
  role: 'management'
  fullName: string
  email: string
  status: AccountStatus
  avatarUrl: string | null
}

/**
 * A signed-in administrator: creates departments and invites officers.
 * Invited, or a SMARTTT administrator.
 */
export interface Admin {
  id: string
  role: 'admin'
  fullName: string
  email: string
  status: AccountStatus
  avatarUrl: string | null
}

/**
 * A signed-in QA officer: institution-wide standards, audits and corrective
 * actions — no department scope of its own, unlike every other
 * officer role. Invited, never self-registered.
 */
export interface QaOfficer {
  id: string
  role: 'qa'
  fullName: string
  email: string
  title: string | null
  status: AccountStatus
  avatarUrl: string | null
}

/** Whoever is signed in. Check `role` before using lecturer-, student-, department-, management-, admin- or qa-only fields. */
export type Account = Lecturer | Student | DepartmentOfficer | ManagementAccount | Admin | QaOfficer

/**
 * An administrator, member of management, department or QA officer as the
 * admin console lists them. PENDING_VERIFICATION means invited but not yet
 * accepted.
 */
export interface Officer {
  userId: string
  /** timetabling: the timetabling office, who sign in at the Timetable Generator. */
  role: 'admin' | 'management' | 'department' | 'qa' | 'timetabling'
  fullName: string
  email: string
  status: AccountStatus
  departmentId: string | null
  departmentName: string | null
  invitedAt: string | null
  /** When the pending invitation link stops working; null once accepted or withdrawn. */
  invitationExpiresAt: string | null
  lastLoginAt: string | null
}

/** POST /admin/invitations: emailSent false means the account exists but the email failed — re-send it. */
export interface InvitationResult {
  userId: string
  emailSent: boolean
}

/** POST /auth/invitations/lookup — who an invitation link is for. */
export interface InvitationDetails {
  fullName: string
  email: string
  role: 'admin' | 'management' | 'department' | 'qa' | 'timetabling'
  /** The department's name; null for the university-wide roles. */
  scopeName: string | null
  expiresAt: string
  /** Where to sign in afterwards when it isn't the staff page here: the Generator, for the timetabling office. */
  signInUrl?: string | null
}

/** GET /admin/directory — departments not yet in SMARTTT. */
export interface DirectoryStatus {
  smartttConnected: boolean
  onlyHere: { departments: number }
}

/** POST /admin/directory/sync */
export interface DirectorySyncResult {
  fromSmarttt: { departments: { linked: number; created: number }; skipped: string[] } | null
  toSmarttt: { departments: number; skipped: string[] }
}

/*
 * SMARTTT's admin functions in the admin console (GET/POST /admin/smarttt/...).
 * The backend passes SMARTTT's own answers through, so these keep SMARTTT's
 * snake_case field names.
 */

/** A page of a SMARTTT list. */
export interface SmartttPage<T> {
  count?: number
  next?: string | null
  results: T[]
}

export interface SmartttTerm {
  id: string
  academic_year: string
  semester: number
  start_date: string | null
  end_date: string | null
  is_current: boolean
}

/** A master timetable upload (history). */
export interface SmartttTimetableUpload {
  id: string
  source_file?: string | null
  term?: string | null
  status: string
  rows_received?: number
  rows_saved?: number
  rows_failed?: number
  created_at?: string
  uploaded_by_name?: string | null
}

/** POST /admin/smarttt/timetable/uploads: started in the background (batch id), or done at once. */
export interface SmartttUploadStarted {
  batch_id?: string
  upload_batch_id?: string
  rows_received?: number
  rows_saved?: number
  total_rows?: number
}

export interface SmartttUploadStatus {
  upload_batch_id: string
  status: 'received' | 'processing' | 'processed' | 'partial' | 'failed' | string
  rows_received: number
  rows_saved: number
  rows_failed: number
}

/** A row of a department's allocation document, as SMARTTT summarises it. */
export interface SmartttAllocationRow {
  unit_code: string | null
  lecturer: string | null
  programme?: string | null
  year_semester?: string | null
  group?: string | null
  department?: string | null
}

/** POST /admin/smarttt/lecturer-allocation */
export interface SmartttAllocationResult {
  detail: string
  source: string
  academic_year: string
  awaiting_timetable: boolean
  matched: number
  unmatched: number
  slots_updated: number
  conflict_slots: number
  results: (SmartttAllocationRow & { slots_assigned: number; account_linked: boolean })[]
  not_found: (SmartttAllocationRow & { reason: string })[]
  conflicts: { slot_id: string; unit_code: string; program: string; candidates: SmartttAllocationRow[] }[]
}

/** GET /admin/smarttt/lecturer-allocation */
export interface SmartttAllocationDocuments {
  academic_year: string | null
  documents: { source: string; file_name: string; rows: number; slots_assigned: number; uploaded_by: string | null; uploaded_at: string }[]
}

export type SmartttNotificationType = 'general' | 'timetable_change' | 'sync_reminder' | 'registration_reminder'
export type SmartttNotificationTarget = 'all' | 'program' | 'year'

export interface SmartttNotification {
  id: string
  title: string
  notification_type: SmartttNotificationType | string
  target: SmartttNotificationTarget | string
  recipients_count: number
  sent_at: string
}

export interface SmartttNotificationSent {
  recipients: number
  push_sent: number
  push_attempted: number
}

export interface SmartttProgram {
  id: string | number
  name: string
  code?: string
}

export interface SmartttStaffId {
  id: string
  staff_id: string
  name_hint: string | null
  is_claimed: boolean
  uploaded_at: string
  file_name: string | null
}

export interface SmartttStaffIdUploads {
  uploads: {
    id: string
    file_name: string
    ids_created: number
    ids_skipped: number
    ids_remaining: number
    ids_claimed: number
    uploaded_by: string | null
    uploaded_at: string
  }[]
  /** IDs loaded before uploads were tracked. */
  untracked_ids: number
}

export interface SmartttVenueSummary {
  total: number
  confirmed: number
  unconfirmed: number
  unconfirmed_codes: string[]
}

export interface SmartttVenueUpload {
  detail?: string
  errors?: { row: number; code?: string; error: string }[]
  summary?: SmartttVenueSummary
}

/** What SMARTTT says after a removal ("Removed 12 staff ID(s) ..."). */
export interface SmartttDetail {
  detail?: string
}

/** A unit the timetable does not list its lecturer for, waiting for an administrator (GET /admin/units/pending). */
export interface PendingUnit {
  unitId: string
  code: string
  name: string | null
  lecturerName: string
  staffNumber: string | null
  departmentName: string | null
  createdAt: string
  /** Weekly meetings; dayOfWeek 0 = Sunday. */
  slots: { dayOfWeek: number; startTime: string; endTime: string; roomCode: string | null }[]
}

/** GET /departments/me — the department the signed-in officer oversees. */
export interface DepartmentProfile {
  departmentId: string
  departmentName: string
  /** Unique across the university; null for one made before codes existed. */
  departmentCode: string | null
}

/** GET /departments/overview — the department dashboard's stat tiles. Rates are 0–100. */
export interface DepartmentOverview {
  lecturerCount: number
  studentCount: number
  unitCount: number
  avgAttendanceRate: number
  sessionsHeld: number
  /** 0–100; null until any session in the department has a scheduled start to measure against. */
  onTimeRate: number | null
}

/** GET /departments/lecturers — one row per lecturer in the department. */
export interface DepartmentLecturer {
  userId: string
  fullName: string
  staffNumber: string
  /** False for a lecturer from another department (or unassigned) who teaches one of this department's units. */
  isOwnStaff: boolean
  homeDepartmentName: string | null
  /** This department's units only; every figure on the row is over these. */
  unitsTaught: number
  /** Units the lecturer teaches for other departments — workload, not counted in this department's figures. */
  unitsElsewhere: number
  studentsTaught: number
  /** 0–100; null until a session has been held for any of their units. */
  avgAttendanceRate: number | null
  sessionsHeld: number
  /** Mean minutes between a class's scheduled start and when it was actually opened; null with nothing to measure. */
  avgLateMinutes: number | null
  /** 0–100; null until a scheduled session has been held. */
  onTimeRate: number | null
}

/**
 * One class meeting as the timekeeping tables read it: when it was meant to
 * start against when the lecturer actually opened it.
 */
export interface LecturerTimekeepingEntry {
  sessionId: string
  unitCode: string
  /** Null for a unit with no issued schedule, so there is nothing to be late against. */
  scheduledStartAt: string | null
  opensAt: string
  /** Minutes after the scheduled start; negative means early. Null when unscheduled. */
  lateMinutes: number | null
}

/** GET /departments/lecturers/:lecturerUserId — the drill-down for one lecturer. */
export interface DepartmentLecturerDetail {
  userId: string
  fullName: string
  staffNumber: string
  units: { unitId: string; code: string; name: string | null; attendanceRate: number | null }[]
  recentSessions: LecturerTimekeepingEntry[]
}

/** GET /departments/timekeeping — recent sessions across the department, newest first. */
export interface DepartmentTimekeepingEntry extends LecturerTimekeepingEntry {
  lecturerName: string
}

/** GET /departments/units — one row per unit taught in the department. */
export interface DepartmentUnit {
  id: string
  code: string
  name: string | null
  lecturerName: string
  studentCount: number
  /** 0–100; null until a session has been held. */
  attendanceRate: number | null
}

/** GET /students/me/units: a unit the student is on, with their attendance in it. */
export interface StudentUnit {
  /** Null for a unit known only from the timetable app (onRoster false). */
  id: string | null
  /** The class: "COSC 103 GR A", or "COSC 103" when not split into groups. */
  code: string
  name: string | null
  baseCode: string | null
  group: string | null
  /** Null when the timetable names no lecturer yet. */
  lecturerName: string | null
  schedule: UnitSchedule | null
  sessionsHeld: number
  sessionsAttended: number
  /** 0–100, one decimal; null until a session has been held. */
  attendanceRate: number | null
  /**
   * True when the student is on the unit's class list here, so can check in. False for a unit
   * they're registered for on the timetable app that their lecturer hasn't set up here yet.
   */
  onRoster: boolean
  /** A split unit they haven't picked a group for on the timetable app yet. */
  groupRequired: boolean
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

/**
 * Where a session's location check is centred. AWAITING_LOCATION: activated
 * from a laptop in a room nobody has surveyed, so scans are held until the
 * lecturer sends the room's position from their phone.
 */
export type GeofenceMode = 'ROOM' | 'LECTURER_DEVICE' | 'AWAITING_LOCATION' | 'OFF'

/** The fence as the lecturer's screens see it. Never its coordinates. */
export interface GeofenceStatus {
  mode: GeofenceMode
  radiusMetres: number | null
  /** The room the timetable puts the class in; null when it names none. */
  roomCode: string | null
  anchorAccuracyMetres: number | null
  hasCentre: boolean
}

/** A device's position, as the browser's Geolocation API reports it. */
export interface DeviceLocation {
  latitude: number
  longitude: number
  /** Metres, 68% confidence. */
  accuracy: number
}

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
  geofence: GeofenceStatus
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
    /** What proved they were present: the QR code, a face the lecturer confirmed, a card swipe. */
    verificationMethod: VerificationMethod
  }[]
}

export type VerificationMethod = 'QR' | 'FINGERPRINT' | 'FACE' | 'CARD'

/** GET /students/me/face — the student's own face check-in status. */
export interface FaceStatus {
  consentGiven: boolean
  consentedAt: string | null
  /** A lecturer has registered their face. */
  enrolled: boolean
  enrolledAt: string | null
}

/** Who the face terminal matched, for the lecturer to check against the person. */
export interface FaceStudentCard {
  studentUserId: string
  fullName: string
  registrationNumber: string | null
  /** Their profile picture: chosen by the student, so only a fallback. */
  avatarDataUrl: string | null
  /** The face photographed when they were registered. Null for registrations made before these were kept. */
  referencePhotoDataUrl: string | null
}

/** POST /sessions/:id/face/identify. Nothing is recorded until the lecturer confirms. */
export type FaceIdentifyResult =
  | {
      result: 'MATCH'
      student: FaceStudentCard
      /** Cosine similarity, 0..1. */
      score: number
      /** Recorded already (by QR or face): no token, nothing to confirm. */
      alreadyCheckedIn: boolean
      matchToken: string | null
      expiresAt: string | null
      facesInFrame: number
      enrolledOnUnit: number
    }
  | { result: 'NO_MATCH' | 'AMBIGUOUS'; facesInFrame: number; enrolledOnUnit: number }

/** POST /sessions/:id/face/confirm */
export interface FaceCheckInResult {
  recordId: string
  sessionId: string
  unitCode: string
  studentUserId: string
  fullName: string
  recordedAt: string
}

/** POST /units/:unitId/students/:studentUserId/face */
export interface FaceEnrollmentResult {
  studentUserId: string
  enrolledAt: string
  replaced: boolean
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
  /** The single weekly slot, or (from /units/current) the meeting on now; null for a unit meeting several times a week. */
  schedule: UnitSchedule | null
  /** Every weekly meeting, Monday first, each with its room. Absent from older backends. */
  slots?: Array<UnitSchedule & { roomCode: string | null }>
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
  /** The student turned on face check-in in their app. A lecturer can only register a face after that. */
  faceConsent: boolean
  /** A lecturer has registered the student's face. */
  faceEnrolled: boolean
  createdAt: string
}

/** GET /lecturers/students — one row per (student, unit): a student on two of the lecturer's units appears twice. */
export interface LecturerStudent {
  id: string
  registrationNumber: string | null
  studentUserId: string | null
  fullName: string | null
  unitId: string
  unitCode: string
  unitName: string | null
  sessionsHeld: number
  sessionsAttended: number
  /** 0–100, one decimal; null until a session has been held for this unit. */
  attendanceRate: number | null
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
  /** An exam room's code: the room the student sits the paper in. */
  room?: string
}

export interface ApiErrorBody {
  message: string
  code?: string
  details?: { field: string; message: string }[]
}

export interface EmailVerificationResult {
  status: string
  nextStep: 'SIGN_IN'
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

/**
 * Quality assurance: standards, checklist-driven audits, findings and
 * corrective actions (CAPA), plus a KPI dashboard. Not auto-scoped to the
 * officer — unlike a department officer, a QA officer's remit is the whole
 * institution, so list endpoints take explicit filters instead. Types mirror
 * the real backend's response shapes field-for-field, verified against the
 * running API.
 */

export const QA_STANDARD_CATEGORIES = [
  'GOVERNANCE',
  'ACADEMIC_PROGRAMS',
  'STAFF',
  'STUDENTS',
  'FACILITIES',
  'FINANCE',
  'RESEARCH',
  'COMMUNITY_ENGAGEMENT',
] as const
export type QaStandardCategory = (typeof QA_STANDARD_CATEGORIES)[number]

/** GET/POST /quality-assurance/standards — the catalog an audit is assessed against. No delete; deactivate via isActive. */
export interface QaStandard {
  id: string
  code: string
  category: QaStandardCategory
  title: string
  description: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** GET/POST /quality-assurance/checklist-templates — a named, ordered list of items, each mapped to one standard. */
export interface QaChecklistTemplate {
  id: string
  name: string
  description: string | null
  isActive: boolean
  itemCount: number
  createdAt: string
  updatedAt: string
}

/** One item within a checklist template, as the template-management view reads it. */
export interface QaChecklistItem {
  id: string
  templateId: string
  standardId: string
  standardCode: string
  standardTitle: string
  standardCategory: QaStandardCategory
  prompt: string
  guidance: string | null
  sortOrder: number
}

export interface QaChecklistTemplateDetail extends QaChecklistTemplate {
  items: QaChecklistItem[]
}

export const QA_AUDIT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'] as const
export type QaAuditStatus = (typeof QA_AUDIT_STATUSES)[number]

/** GET/POST /quality-assurance/audits — one audit targets exactly one department. */
export interface QaAudit {
  id: string
  title: string
  auditType: string
  targetDepartmentId: string
  targetDepartmentName: string
  checklistTemplateId: string
  checklistTemplateName: string
  leadAuditorUserId: string
  leadAuditorName: string
  scheduledDate: string
  status: QaAuditStatus
  startedAt: string | null
  completedAt: string | null
  notes: string | null
  totalItems: number
  findingsRecorded: number
  createdAt: string
  updatedAt: string
}

export const QA_FINDING_RATINGS = ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE'] as const
export type QaFindingRating = (typeof QA_FINDING_RATINGS)[number]

/** One checklist item, left-joined to its finding (if any) — GET /quality-assurance/audits/:id/checklist, the "fill checklist" view. */
export interface QaChecklistViewItem {
  checklistItemId: string
  prompt: string
  guidance: string | null
  sortOrder: number
  standardId: string
  standardCode: string
  standardTitle: string
  standardCategory: QaStandardCategory
  finding: {
    id: string
    rating: QaFindingRating
    score: number | null
    evidenceNotes: string | null
    recordedByUserId: string
    updatedAt: string
  } | null
}

/** GET /quality-assurance/audits/:id/findings; PUT .../findings/:checklistItemId upserts one. */
export interface QaFinding {
  id: string
  auditId: string
  checklistItemId: string
  rating: QaFindingRating
  score: number | null
  evidenceNotes: string | null
  recordedByUserId: string
  createdAt: string
  updatedAt: string
}

export const QA_CAPA_STATUSES = ['OPEN', 'IN_PROGRESS', 'VERIFIED', 'CLOSED'] as const
export type QaCapaStatus = (typeof QA_CAPA_STATUSES)[number]

/** GET/POST /quality-assurance/corrective-actions — raised only against a NON_COMPLIANT/PARTIAL finding. */
export interface QaCorrectiveAction {
  id: string
  findingId: string
  description: string
  ownerUserId: string
  ownerName: string
  dueDate: string
  status: QaCapaStatus
  verifiedByUserId: string | null
  verifiedByName: string | null
  verifiedAt: string | null
  isOverdue: boolean
  auditId: string
  auditTitle: string
  rating: QaFindingRating
  standardCode: string
  standardTitle: string
  targetDepartmentId: string
  createdAt: string
  updatedAt: string
}

export interface QaComplianceByStandard {
  standardId: string
  standardCode: string
  standardTitle: string
  category: QaStandardCategory
  avgScore: number | null
  sampleCount: number
}

export interface QaComplianceByCategory {
  category: QaStandardCategory
  avgScore: number | null
  sampleCount: number
}

export interface QaAttendanceTrendPoint {
  periodStart: string
  departmentId: string
  departmentName: string
  avgAttendanceRate: number
}

/** GET /quality-assurance/departments — a bare id/name lookup for the audit-target picker. */
export interface QaDirectoryEntry {
  id: string
  name: string
}

/** GET /quality-assurance/dashboard — audit completion, compliance rollups, overdue CAPA, attendance trend. */
export interface QaDashboard {
  /** 0–100, one decimal; null when no audit matches the filters yet. */
  auditCompletionRate: number | null
  auditsCompleted: number
  auditsTotal: number
  complianceByStandard: QaComplianceByStandard[]
  complianceByCategory: QaComplianceByCategory[]
  overdueCapaCount: number
  attendanceTrends: QaAttendanceTrendPoint[]
}

/** GET /admin/lecturers — a lecturer and the department they belong to, if any. */
export interface PlacementLecturer {
  userId: string
  fullName: string
  staffNumber: string
  title: string | null
  email: string
  /** Null while unassigned: SMARTTT's department name matched no department here. */
  departmentId: string | null
  departmentName: string | null
  /** What SMARTTT/ERP called their department, to help decide where they belong. */
  reportedDepartment: string | null
  unitCount: number
}

/** GET /admin/departments */
export interface AdminDepartment {
  departmentId: string
  name: string
  /** Unique across the university ("DCOMP"); how the Timetable Allocator and Generator know it. Null for one made before codes existed. */
  code: string | null
  /** Linked to SMARTTT's department (SMARTTT owns departments); false for one only here. */
  inSmarttt: boolean
  lecturerCount: number
}

/** POST /admin/departments */
export interface CreatedDepartment {
  departmentId: string
  name: string
  code: string
}

/** GET /attendance-policy — the minimum attendance to sit exams, one setting for the institution. */
export interface AttendancePolicy {
  minAttendancePercent: number
  atRiskMarginPercent: number
  updatedAt: string
  updatedByName: string | null
}

export type EligibilityStatus = 'ELIGIBLE' | 'AT_RISK' | 'NOT_ELIGIBLE' | 'NOT_YET_MEASURED'

/** One (student, unit) pair judged against the attendance policy. */
export interface EligibilityRow {
  allocationId: string
  studentUserId: string | null
  registrationNumber: string | null
  fullName: string | null
  unitId: string
  unitCode: string
  unitName: string | null
  lecturerName: string
  departmentId: string | null
  departmentName: string | null
  sessionsHeld: number
  sessionsAttended: number
  attendanceRate: number | null
  status: EligibilityStatus
}

/** GET /departments/eligibility, /quality-assurance/eligibility */
export interface EligibilityReport {
  policy: AttendancePolicy
  summary: { total: number; eligible: number; atRisk: number; notEligible: number; notYetMeasured: number }
  /** At-risk and not-eligible rows only, worst first, unless asked for all. */
  rows: EligibilityRow[]
}

export type EvaluationQuestionKind = 'RATING' | 'TEXT'
export type EvaluationRoundStatus = 'UPCOMING' | 'OPEN' | 'CLOSED'

export interface EvaluationQuestion {
  id: string
  position: number
  prompt: string
  kind: EvaluationQuestionKind
  required: boolean
}

export interface EvaluationQuestionInput {
  prompt: string
  kind: EvaluationQuestionKind
  required: boolean
}

/** A course evaluation round as listed. */
export interface EvaluationRound {
  id: string
  title: string
  instructions: string | null
  opensAt: string
  closesAt: string
  status: EvaluationRoundStatus
  /** Below this many responses a unit's results are withheld, so a small class cannot be read off. */
  minResponses: number
  questionCount: number
  responseCount: number
  createdAt: string
}

export interface EvaluationRoundDetail extends EvaluationRound {
  questions: EvaluationQuestion[]
  /** False once any student has answered: the questions are then fixed. */
  questionsEditable: boolean
}

export interface EvaluationRoundInput {
  title: string
  instructions?: string
  opensAt: string
  closesAt: string
  minResponses?: number
  questions: EvaluationQuestionInput[]
}

export interface EvaluationQuestionResult {
  questionId: string
  answered: number
  /** 1–5, two decimals. */
  average: number
  /** How many 1s, 2s, 3s, 4s and 5s. */
  distribution: [number, number, number, number, number]
}

export interface EvaluationUnitResult {
  unitId: string
  unitCode: string
  unitName: string | null
  lecturerName: string | null
  departmentId: string | null
  departmentName: string | null
  responses: number
  enrolled: number
  responseRate: number | null
  /** False below the round's minimum responses: ratings and comments are withheld. */
  reportable: boolean
  ratings: EvaluationQuestionResult[]
  comments: { questionId: string; text: string }[]
}

/** GET …/evaluations/:id(/results) */
export interface EvaluationResults {
  round: EvaluationRoundDetail
  totalResponses: number
  overall: EvaluationQuestionResult[]
  units: EvaluationUnitResult[]
}

/** GET /students/me/evaluations — an open round with the student's units in it. */
export interface StudentEvaluationRound {
  id: string
  title: string
  instructions: string | null
  closesAt: string
  questions: EvaluationQuestion[]
  units: { unitId: string; unitCode: string; unitName: string | null; lecturerName: string; submitted: boolean }[]
}

export interface EvaluationAnswerInput {
  questionId: string
  rating?: number
  text?: string
}

/** PATCH …/lecturers/:id/department — the lecturer as placed, plus what the system learned from it. */
export interface PlacementResult extends PlacementLecturer {
  /** SMARTTT's spelling, now recognised as this department; null when nothing new was learned. */
  learnedSpelling: string | null
  /** Other unassigned lecturers with the same spelling, placed along with this one. */
  alsoPlaced: number
}

/** GET /admin/department-aliases — another spelling of a department, learned from a placement or a merge. */
export interface DepartmentAlias {
  aliasId: string
  alias: string
  departmentId: string
  departmentName: string
  source: 'PLACEMENT' | 'MERGE'
  createdByName: string | null
  createdAt: string
}

/** GET /admin/department-duplicates — one of a group of departments whose names mean the same thing. */
export interface DuplicateDepartment {
  departmentId: string
  name: string
  code: string | null
  lecturerCount: number
  unitCount: number
}

/*
 * Management (GET /management/*): university-wide attendance in three levels,
 * departments -> a department's Years 1-4 -> one year's units with their
 * lecturer and students. Mirrors src/modules/management on the backend. A
 * rate is null, not 0, until a class with a roster has been held.
 */

/** One department in the university, as the management overview compares them. */
export interface ManagementDepartment {
  departmentId: string
  departmentName: string
  departmentCode: string | null
  unitCount: number
  studentCount: number
  sessionsHeld: number
  /** Check-ins recorded in the department's classes. */
  checkIns: number
  /** Mean per-session attendance rate, 0-100. */
  avgAttendanceRate: number | null
}

/** GET /management/departments */
export interface ManagementUniversity {
  totals: { departmentCount: number; checkIns: number; sessionsHeld: number }
  departments: ManagementDepartment[]
}

/** One year of study within a department. */
export interface ManagementYear {
  year: number
  unitCount: number
  studentCount: number
  sessionsHeld: number
  checkIns: number
  avgAttendanceRate: number | null
}

/** GET /management/departments/:departmentId — always Years 1-4, even when empty. */
export interface ManagementDepartmentYears {
  departmentId: string
  departmentName: string
  departmentCode: string | null
  years: ManagementYear[]
  /** Units whose code puts them in no year (postgraduate). */
  unitsWithoutYear: number
}

/** A student on a unit's roster, with how many of its classes they attended. */
export interface ManagementStudent {
  studentUserId: string | null
  registrationNumber: string | null
  fullName: string | null
  yearOfStudy: number | null
  sessionsHeld: number
  sessionsAttended: number
  attendanceRate: number | null
}

/** One unit taught in a year, with its lecturer and every student taking it. */
export interface ManagementUnit {
  unitId: string
  unitCode: string
  unitName: string | null
  lecturerUserId: string
  lecturerName: string
  staffNumber: string | null
  sessionsHeld: number
  avgAttendanceRate: number | null
  students: ManagementStudent[]
}

/** GET /management/departments/:departmentId/years/:year */
export interface ManagementYearDetail {
  departmentId: string
  departmentName: string
  departmentCode: string | null
  year: number
  units: ManagementUnit[]
}

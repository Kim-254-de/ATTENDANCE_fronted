import { Navigate, useSearchParams } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { LoginPage } from '@/auth/LoginPage'
import { ForgotPasswordPage } from '@/auth/ForgotPasswordPage'
import { RequireAuth } from '@/auth/RequireAuth'
import { SetPasswordPage } from '@/auth/SetPasswordPage'
import { VerifyEmailPage } from '@/auth/VerifyEmailPage'
import { AppLayout } from '@/portals/lecturer/layout/AppLayout'
import { DepartmentLayout } from '@/portals/department/layout/DepartmentLayout'
import { ManagementLayout } from '@/portals/management/layout/ManagementLayout'
import { AdminLayout } from '@/portals/admin/layout/AdminLayout'
import { QaLayout } from '@/portals/qa/layout/QaLayout'
import { StudentLayout } from '@/portals/student/layout/StudentLayout'
import { LandingPage } from '@/pages/LandingPage'

/** Every officer role shares one profile page; the route says whose. */
const officerProfile = (role: 'admin' | 'department' | 'management' | 'qa') => async () => {
  const { OfficerProfilePage } = await import('@/components/officers/OfficerProfilePage')
  return { Component: () => <OfficerProfilePage role={role} /> }
}

/** Sends an old sign-up link to the matching sign-in page, saying why. */
function SignupRedirect() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') === 'student' ? 'student' : 'lecturer'
  return (
    <Navigate
      to={`/login?role=${role}`}
      replace
      state={{ message: 'There is no separate sign-up for attendance. Sign in with your SMARTTT account; if you have none, create it in SMARTTT first.' }}
    />
  )
}

// Pages are code-split so the login screen doesn't download the dashboard.
export const routes = [
  { path: '/', element: <LandingPage />, errorElement: <RouteError /> },
  {
    path: '/terms',
    lazy: async () => ({ Component: (await import('@/pages/TermsAndConditionsPage')).TermsAndConditionsPage }),
    errorElement: <RouteError />,
  },
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  // Staff sign-in for administrators, management and department officers. Unlisted: given out in
  // invitation emails, never linked from the public role selector.
  { path: '/oversight', element: <LoginPage oversight />, errorElement: <RouteError /> },
  { path: '/accept-invite', element: <SetPasswordPage mode="invite" />, errorElement: <RouteError /> },
  { path: '/reset-password', element: <SetPasswordPage mode="reset" />, errorElement: <RouteError /> },
  // No sign-up: students and lecturers sign in with their SMARTTT account. Old links land on sign-in.
  { path: '/signup', element: <SignupRedirect /> },
  { path: '/register', element: <SignupRedirect /> },
  { path: '/verify-email', element: <VerifyEmailPage />, errorElement: <RouteError /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteError /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    // Which role may open each page lives on these route objects: RequireAuth reads
    // `handle.role` off the matched route rather than keeping its own list of paths.
    children: [
      {
        // Full-bleed: no shell chrome, same reasoning as the lecturer's session/:sessionId below.
        path: 'scan',
        lazy: async () => ({ Component: (await import('@/portals/student/ScanPage')).ScanPage }),
        handle: { title: 'Scan to check in', role: 'student' },
      },
      {
        element: <StudentLayout />,
        errorElement: <RouteError />,
        handle: { role: 'student' },
        children: [
          {
            path: 'student-dashboard',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentDashboardPage')).StudentDashboardPage }),
            handle: { title: 'Student Dashboard' },
          },
          {
            path: 'student-units',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentUnitsPage')).StudentUnitsPage }),
            handle: { title: 'My Units' },
          },
          {
            path: 'student-attendance',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentAttendanceHistoryPage')).StudentAttendanceHistoryPage }),
            handle: { title: 'Attendance History' },
          },
          {
            path: 'student-progress',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentProgressPage')).StudentProgressPage }),
            handle: { title: 'Progress' },
          },
          {
            path: 'student-evaluations',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentEvaluationsPage')).StudentEvaluationsPage }),
            handle: { title: 'Course Evaluations' },
          },
          {
            path: 'student-profile',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentProfilePage')).StudentProfilePage }),
            handle: { title: 'Student Profile' },
          },
        ],
      },
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        handle: { role: 'lecturer' },
        children: [
          {
            path: 'lecturer-dashboard',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/dashboard/OverviewPage')).OverviewPage }),
          },
          {
            path: 'profile',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/profile/ProfilePage')).ProfilePage }),
            handle: { title: 'My Profile' },
          },
          {
            path: 'profile/edit',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/profile/EditProfilePage')).EditProfilePage }),
            handle: { title: 'Edit Profile' },
          },
          {
            path: 'attendance',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/attendance/AttendanceReportsPage')).AttendanceReportsPage }),
            handle: { title: 'Attendance Reports' },
          },
          {
            path: 'students',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/students/StudentsPage')).StudentsPage }),
            handle: { title: 'Students' },
          },
          {
            path: 'units',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/units/UnitsPage')).UnitsPage }),
            handle: { title: 'Units' },
          },
          {
            // Opened on the lecturer's phone to send the room's location to a class their laptop is showing.
            path: 'session/:sessionId/locate',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/attendance/ShareLocationPage')).ShareLocationPage }),
            handle: { title: 'Share Location' },
          },
          {
            path: 'units/:unitId',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/units/UnitStudentsPage')).UnitStudentsPage }),
            handle: { title: 'Unit Students' },
          },
          {
            // Invigilation: the lecturer's exam rooms, from SMARTTT's exam timetable.
            path: 'exams',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/exams/ExamsPage')).ExamsPage }),
            handle: { title: 'Exams' },
          },
        ],
      },
      {
        // The lecturer's phone as a face check-in terminal. Full-bleed, like the session it belongs to.
        path: 'session/:sessionId/face',
        lazy: async () => ({ Component: (await import('@/portals/lecturer/attendance/FaceTerminalPage')).FaceTerminalPage }),
        handle: { title: 'Face Check-in', role: 'lecturer' },
      },
      {
        element: <DepartmentLayout />,
        errorElement: <RouteError />,
        handle: { role: 'department' },
        children: [
          {
            path: 'department-profile',
            lazy: officerProfile('department'),
            handle: { title: 'My Profile' },
          },
          {
            path: 'department-dashboard',
            lazy: async () => ({ Component: (await import('@/portals/department/dashboard/OverviewPage')).OverviewPage }),
            handle: { title: 'Performance Dashboard' },
          },
          {
            path: 'department-teaching',
            lazy: async () => ({ Component: (await import('@/portals/department/teaching/TeachingPage')).TeachingPage }),
            handle: { title: 'Teaching' },
          },
          // The old Courses page: teaching replaced it.
          { path: 'department-courses', element: <Navigate to="/department-teaching" replace /> },
          {
            path: 'department-lecturers',
            lazy: async () => ({ Component: (await import('@/portals/department/lecturers/LecturersPage')).LecturersPage }),
            handle: { title: 'Lecturers' },
          },
          {
            path: 'department-lecturers/:lecturerUserId',
            lazy: async () => ({ Component: (await import('@/portals/department/lecturers/LecturerDetailPage')).LecturerDetailPage }),
            handle: { title: 'Lecturer' },
          },
          {
            path: 'department-students',
            lazy: async () => ({ Component: (await import('@/portals/department/students/StudentsPage')).StudentsPage }),
            handle: { title: 'Students' },
          },
          {
            path: 'department-units',
            lazy: async () => ({ Component: (await import('@/portals/department/units/UnitsPage')).UnitsPage }),
            handle: { title: 'Units' },
          },
          {
            path: 'department-eligibility',
            lazy: async () => ({ Component: (await import('@/portals/department/eligibility/EligibilityPage')).EligibilityPage }),
            handle: { title: 'Exam Eligibility' },
          },
          {
            path: 'department-evaluations',
            lazy: async () => ({ Component: (await import('@/portals/department/evaluations/EvaluationsPage')).EvaluationsPage }),
            handle: { title: 'Course Evaluations' },
          },
          {
            path: 'department-evaluations/:roundId',
            lazy: async () => ({ Component: (await import('@/portals/department/evaluations/EvaluationResultsPage')).EvaluationResultsPage }),
            handle: { title: 'Evaluation Results' },
          },
          {
            path: 'department-terminals',
            lazy: async () => ({ Component: (await import('@/portals/department/terminals/TerminalsPage')).TerminalsPage }),
            handle: { title: 'Terminals' },
          },
          {
            path: 'department-enrolment',
            lazy: async () => ({ Component: (await import('@/portals/department/terminals/EnrolmentPage')).EnrolmentPage }),
            handle: { title: 'Fingerprint Enrolment' },
          },
        ],
      },
      {
        // Full-bleed: no sidebar/bottom-nav chrome, so this is what's actually projected in the room.
        path: 'session/:sessionId',
        lazy: async () => ({ Component: (await import('@/portals/lecturer/attendance/LiveSessionPage')).LiveSessionPage }),
        handle: { title: 'Live Session', role: 'lecturer' },
      },
      {
        // An exam room's code, full-bleed like a live class: it's what the room sees.
        path: 'exam-room/:sessionId',
        lazy: async () => ({ Component: (await import('@/portals/lecturer/exams/ExamRoomPage')).ExamRoomPage }),
        handle: { title: 'Exam Room', role: 'lecturer' },
      },
      {
        // Management: university-wide attendance, departments -> years -> units -> unit.
        element: <ManagementLayout />,
        errorElement: <RouteError />,
        handle: { role: 'management' },
        children: [
          {
            path: 'management/profile',
            lazy: officerProfile('management'),
            handle: { title: 'My Profile' },
          },
          {
            path: 'management',
            lazy: async () => ({ Component: (await import('@/portals/management/DepartmentsPage')).DepartmentsPage }),
            handle: { title: 'University Attendance' },
          },
          {
            path: 'management/departments/:departmentId',
            lazy: async () => ({ Component: (await import('@/portals/management/YearsPage')).YearsPage }),
            handle: { title: 'Department Attendance' },
          },
          {
            path: 'management/departments/:departmentId/years/:year',
            lazy: async () => ({ Component: (await import('@/portals/management/UnitsPage')).UnitsPage }),
            handle: { title: 'Year Attendance' },
          },
          {
            path: 'management/departments/:departmentId/years/:year/units/:unitId',
            lazy: async () => ({ Component: (await import('@/portals/management/UnitPage')).UnitPage }),
            handle: { title: 'Unit Attendance' },
          },
          // Old faculty portal links land on the management overview.
          { path: 'faculty-dashboard', element: <Navigate to="/management" replace /> },
          { path: 'faculty-departments', element: <Navigate to="/management" replace /> },
        ],
      },
      {
        element: <AdminLayout />,
        errorElement: <RouteError />,
        handle: { role: 'admin' },
        children: [
          {
            path: 'admin-profile',
            lazy: officerProfile('admin'),
            handle: { title: 'My Profile' },
          },
          {
            path: 'admin',
            lazy: async () => ({ Component: (await import('@/portals/admin/OfficersPage')).OfficersPage }),
            handle: { title: 'Officers' },
          },
          // Faculties are gone; an old link lands on the departments, which the admin now creates.
          { path: 'admin-faculties', element: <Navigate to="/admin-departments" replace /> },
          {
            path: 'admin-departments',
            lazy: async () => ({ Component: (await import('@/portals/admin/DepartmentsPage')).DepartmentsPage }),
            handle: { title: 'Departments' },
          },
          {
            path: 'admin-lecturers',
            lazy: async () => ({ Component: (await import('@/portals/admin/LecturersPage')).LecturersPage }),
            handle: { title: 'Lecturers' },
          },
          {
            path: 'admin-units',
            lazy: async () => ({ Component: (await import('@/portals/admin/PendingUnitsPage')).PendingUnitsPage }),
            handle: { title: 'Units to Verify' },
          },
          {
            // SMARTTT's admin functions (its old separate admin page), reached through the attendance API.
            path: 'admin-smarttt',
            lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/SmartttLayout')).SmartttLayout }),
            handle: { title: 'SMARTTT' },
            children: [
              { index: true, element: <Navigate to="terms" replace /> },
              {
                path: 'terms',
                lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/TermsPage')).TermsPage }),
                handle: { title: 'SMARTTT · Terms' },
              },
              {
                path: 'timetable',
                lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/TimetablePage')).TimetablePage }),
                handle: { title: 'SMARTTT · Master Timetable' },
              },
              {
                path: 'allocation',
                lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/AllocationPage')).AllocationPage }),
                handle: { title: 'SMARTTT · Lecturer Allocation' },
              },
              {
                path: 'notifications',
                lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/NotificationsPage')).NotificationsPage }),
                handle: { title: 'SMARTTT · Notifications' },
              },
              {
                path: 'staff-ids',
                lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/StaffIdsPage')).StaffIdsPage }),
                handle: { title: 'SMARTTT · Staff IDs' },
              },
              {
                path: 'venues',
                lazy: async () => ({ Component: (await import('@/portals/admin/smarttt/VenuesPage')).VenuesPage }),
                handle: { title: 'SMARTTT · Venues' },
              },
            ],
          },
        ],
      },
      {
        element: <QaLayout />,
        errorElement: <RouteError />,
        handle: { role: 'qa' },
        children: [
          {
            path: 'qa-profile',
            lazy: officerProfile('qa'),
            handle: { title: 'My Profile' },
          },
          {
            path: 'qa-dashboard',
            lazy: async () => ({ Component: (await import('@/portals/qa/dashboard/OverviewPage')).OverviewPage }),
            handle: { title: 'KPI Dashboard' },
          },
          {
            path: 'qa-standards',
            lazy: async () => ({ Component: (await import('@/portals/qa/standards/StandardsPage')).StandardsPage }),
            handle: { title: 'Standards' },
          },
          {
            path: 'qa-checklists',
            lazy: async () => ({ Component: (await import('@/portals/qa/checklists/ChecklistsPage')).ChecklistsPage }),
            handle: { title: 'Checklist Templates' },
          },
          {
            path: 'qa-checklists/:templateId',
            lazy: async () => ({ Component: (await import('@/portals/qa/checklists/ChecklistDetailPage')).ChecklistDetailPage }),
            handle: { title: 'Checklist Template' },
          },
          {
            path: 'qa-audits',
            lazy: async () => ({ Component: (await import('@/portals/qa/audits/AuditsPage')).AuditsPage }),
            handle: { title: 'Audits' },
          },
          {
            path: 'qa-audits/:auditId',
            lazy: async () => ({ Component: (await import('@/portals/qa/audits/AuditDetailPage')).AuditDetailPage }),
            handle: { title: 'Audit' },
          },
          {
            path: 'qa-corrective-actions',
            lazy: async () => ({ Component: (await import('@/portals/qa/capa/CapaPage')).CapaPage }),
            handle: { title: 'Corrective Actions' },
          },
          {
            path: 'qa-eligibility',
            lazy: async () => ({ Component: (await import('@/portals/qa/eligibility/EligibilityPage')).EligibilityPage }),
            handle: { title: 'Exam Eligibility' },
          },
          {
            path: 'qa-evaluations',
            lazy: async () => ({ Component: (await import('@/portals/qa/evaluations/EvaluationsPage')).EvaluationsPage }),
            handle: { title: 'Course Evaluations' },
          },
          {
            path: 'qa-evaluations/:roundId',
            lazy: async () => ({ Component: (await import('@/portals/qa/evaluations/EvaluationDetailPage')).EvaluationDetailPage }),
            handle: { title: 'Course Evaluation' },
          },
        ],
      },
    ],
  },
  { path: '*', errorElement: <RouteError />, loader: () => { throw new Response('Not Found', { status: 404 }) } },
]

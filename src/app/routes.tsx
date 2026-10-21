import { Navigate, useSearchParams } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { LoginPage } from '@/auth/LoginPage'
import { ForgotPasswordPage } from '@/auth/ForgotPasswordPage'
import { RequireAuth } from '@/auth/RequireAuth'
import { SetPasswordPage } from '@/auth/SetPasswordPage'
import { VerifyEmailPage } from '@/auth/VerifyEmailPage'
import { AppLayout } from '@/portals/lecturer/layout/AppLayout'
import { DepartmentLayout } from '@/portals/department/layout/DepartmentLayout'
import { FacultyLayout } from '@/portals/faculty/layout/FacultyLayout'
import { AdminLayout } from '@/portals/admin/layout/AdminLayout'
import { QaLayout } from '@/portals/qa/layout/QaLayout'
import { StudentLayout } from '@/portals/student/layout/StudentLayout'
import { LandingPage } from '@/pages/LandingPage'

/** Every officer role shares one profile page; the route says whose. */
const officerProfile = (role: 'admin' | 'department' | 'faculty' | 'qa') => async () => {
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
  // Staff sign-in for administrators and faculty and department officers. Unlisted: given out in
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
            path: 'department-courses',
            lazy: async () => ({ Component: (await import('@/portals/department/courses/CoursesPage')).CoursesPage }),
            handle: { title: 'Courses' },
          },
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
        element: <FacultyLayout />,
        errorElement: <RouteError />,
        handle: { role: 'faculty' },
        children: [
          {
            path: 'faculty-profile',
            lazy: officerProfile('faculty'),
            handle: { title: 'My Profile' },
          },
          {
            path: 'faculty-dashboard',
            lazy: async () => ({ Component: (await import('@/portals/faculty/dashboard/OverviewPage')).OverviewPage }),
            handle: { title: 'Performance Dashboard' },
          },
          {
            path: 'faculty-departments',
            lazy: async () => ({ Component: (await import('@/portals/faculty/departments/DepartmentsPage')).DepartmentsPage }),
            handle: { title: 'Departments' },
          },
          {
            path: 'faculty-departments/:departmentId',
            lazy: async () => ({ Component: (await import('@/portals/faculty/departments/DepartmentDetailPage')).DepartmentDetailPage }),
            handle: { title: 'Department' },
          },
          {
            path: 'faculty-courses',
            lazy: async () => ({ Component: (await import('@/portals/faculty/courses/CoursesPage')).CoursesPage }),
            handle: { title: 'Courses' },
          },
          {
            path: 'faculty-lecturers',
            lazy: async () => ({ Component: (await import('@/portals/faculty/lecturers/LecturersPage')).LecturersPage }),
            handle: { title: 'Lecturers' },
          },
          {
            path: 'faculty-lecturers/:lecturerUserId',
            lazy: async () => ({ Component: (await import('@/portals/faculty/lecturers/LecturerDetailPage')).LecturerDetailPage }),
            handle: { title: 'Lecturer' },
          },
          {
            path: 'faculty-students',
            lazy: async () => ({ Component: (await import('@/portals/faculty/students/StudentsPage')).StudentsPage }),
            handle: { title: 'Students' },
          },
          {
            path: 'faculty-units',
            lazy: async () => ({ Component: (await import('@/portals/faculty/units/UnitsPage')).UnitsPage }),
            handle: { title: 'Units' },
          },
          {
            path: 'faculty-officers',
            lazy: async () => ({ Component: (await import('@/portals/faculty/officers/OfficersPage')).OfficersPage }),
            handle: { title: 'Department Officers' },
          },
          {
            path: 'faculty-placement',
            lazy: async () => ({ Component: (await import('@/portals/faculty/placement/PlacementPage')).PlacementPage }),
            handle: { title: 'Lecturer Placement' },
          },
          {
            path: 'faculty-eligibility',
            lazy: async () => ({ Component: (await import('@/portals/faculty/eligibility/EligibilityPage')).EligibilityPage }),
            handle: { title: 'Exam Eligibility' },
          },
          {
            path: 'faculty-evaluations',
            lazy: async () => ({ Component: (await import('@/portals/faculty/evaluations/EvaluationsPage')).EvaluationsPage }),
            handle: { title: 'Course Evaluations' },
          },
          {
            path: 'faculty-evaluations/:roundId',
            lazy: async () => ({ Component: (await import('@/portals/faculty/evaluations/EvaluationResultsPage')).EvaluationResultsPage }),
            handle: { title: 'Evaluation Results' },
          },
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
          {
            path: 'admin-faculties',
            lazy: async () => ({ Component: (await import('@/portals/admin/FacultiesPage')).FacultiesPage }),
            handle: { title: 'Faculties' },
          },
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

import { Navigate } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { LoginPage } from '@/auth/LoginPage'
import { ForgotPasswordPage } from '@/auth/ForgotPasswordPage'
import { SignupPage } from '@/auth/SignupPage'
import { RequireAuth } from '@/auth/RequireAuth'
import { VerifyEmailPage } from '@/auth/VerifyEmailPage'
import { AppLayout } from '@/portals/lecturer/layout/AppLayout'
import { StudentLayout } from '@/portals/student/layout/StudentLayout'
import { LandingPage } from '@/pages/LandingPage'

// Pages are code-split so the login screen doesn't download the dashboard.
export const routes = [
  { path: '/', element: <LandingPage />, errorElement: <RouteError /> },
  {
    path: '/terms',
    lazy: async () => ({ Component: (await import('@/pages/TermsAndConditionsPage')).TermsAndConditionsPage }),
    errorElement: <RouteError />,
  },
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  { path: '/signup', element: <SignupPage />, errorElement: <RouteError /> },
  { path: '/register', element: <Navigate to="/signup?role=lecturer" replace /> },
  { path: '/verify-email', element: <VerifyEmailPage />, errorElement: <RouteError /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteError /> },
  {
    path: '/admin',
    lazy: async () => ({ Component: (await import('@/portals/admin/AdminComingSoonPage')).AdminComingSoonPage }),
    errorElement: <RouteError />,
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        // Full-bleed: no shell chrome, same reasoning as the lecturer's session/:sessionId below.
        path: 'scan',
        lazy: async () => ({ Component: (await import('@/portals/student/ScanPage')).ScanPage }),
        handle: { title: 'Scan to check in' },
      },
      {
        element: <StudentLayout />,
        errorElement: <RouteError />,
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
            path: 'student-profile',
            lazy: async () => ({ Component: (await import('@/portals/student/StudentProfilePage')).StudentProfilePage }),
            handle: { title: 'Student Profile' },
          },
        ],
      },
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
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
        // Full-bleed: no sidebar/bottom-nav chrome, so this is what's actually projected in the room.
        path: 'session/:sessionId',
        lazy: async () => ({ Component: (await import('@/portals/lecturer/attendance/LiveSessionPage')).LiveSessionPage }),
        handle: { title: 'Live Session' },
      },
    ],
  },
  { path: '*', errorElement: <RouteError />, loader: () => { throw new Response('Not Found', { status: 404 }) } },
]

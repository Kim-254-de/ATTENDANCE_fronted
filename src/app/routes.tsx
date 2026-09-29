import { Navigate } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { LoginPage } from '@/auth/LoginPage'
import { ForgotPasswordPage } from '@/auth/ForgotPasswordPage'
import { SignupPage } from '@/auth/SignupPage'
import { RequireAuth } from '@/auth/RequireAuth'
import { VerifyEmailPage } from '@/auth/VerifyEmailPage'
import { AppLayout } from '@/portals/lecturer/layout/AppLayout'
import { ComingSoon } from '@/pages/ComingSoon'

// Pages are code-split so the login screen doesn't download the dashboard.
export const routes = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  { path: '/signup', element: <SignupPage />, errorElement: <RouteError /> },
  { path: '/register', element: <Navigate to="/signup" replace /> },
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
        path: 'student-profile',
        lazy: async () => ({ Component: (await import('@/portals/student/StudentProfilePage')).StudentProfilePage }),
        handle: { title: 'Student Profile' },
      },
      {
        path: 'student-dashboard',
        lazy: async () => ({ Component: (await import('@/portals/student/StudentDashboardPage')).StudentDashboardPage }),
        handle: { title: 'Student Dashboard' },
      },
      {
        // Student check-in: scan the lecturer's projected QR code with the phone camera.
        path: 'scan',
        lazy: async () => ({ Component: (await import('@/portals/student/ScanPage')).ScanPage }),
        handle: { title: 'Scan to check in' },
      },
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          {
            index: true,
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
          { path: 'students', element: <ComingSoon name="Students" />, handle: { title: 'Students' } },
          {
            path: 'units',
            lazy: async () => ({ Component: (await import('@/portals/lecturer/units/UnitsPage')).UnitsPage }),
            handle: { title: 'Units' },
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

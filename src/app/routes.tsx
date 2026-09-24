import { Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteError } from '@/components/RouteError'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'
import { ComingSoon } from '@/pages/ComingSoon'

// Pages are code-split so the login screen doesn't download the dashboard.
export const routes = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  { path: '/signup', element: <SignupPage />, errorElement: <RouteError /> },
  { path: '/register', element: <Navigate to="/signup" replace /> },
  { path: '/verify-email', element: <VerifyEmailPage />, errorElement: <RouteError /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteError /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        path: 'student-profile',
        lazy: async () => ({ Component: (await import('@/features/auth/StudentProfilePage')).StudentProfilePage }),
        handle: { title: 'Student Profile' },
      },
      {
        path: 'student-dashboard',
        lazy: async () => ({ Component: (await import('@/features/dashboard/StudentDashboardPage')).StudentDashboardPage }),
        handle: { title: 'Student Dashboard' },
      },
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/dashboard/OverviewPage')).OverviewPage }),
            handle: { title: 'Dashboard Overview' },
          },
          {
            path: 'profile',
            lazy: async () => ({ Component: (await import('@/features/auth/ProfilePage')).ProfilePage }),
            handle: { title: 'My Profile' },
          },
          {
            path: 'attendance',
            lazy: async () => ({ Component: (await import('@/features/attendance/AttendanceReportsPage')).AttendanceReportsPage }),
            handle: { title: 'Attendance Reports' },
          },
          { path: 'students', element: <ComingSoon name="Students" />, handle: { title: 'Students' } },
          {
            path: 'units',
            lazy: async () => ({ Component: (await import('@/features/units/UnitsPage')).UnitsPage }),
            handle: { title: 'Units' },
          },
          {
            path: 'units/:unitId',
            lazy: async () => ({ Component: (await import('@/features/units/UnitStudentsPage')).UnitStudentsPage }),
            handle: { title: 'Unit Students' },
          },
        ],
      },
      {
        // Full-bleed: no sidebar/bottom-nav chrome, so this is what's actually projected in the room.
        path: 'session/:sessionId',
        lazy: async () => ({ Component: (await import('@/features/attendance/LiveSessionPage')).LiveSessionPage }),
        handle: { title: 'Live Session' },
      },
    ],
  },
  { path: '*', errorElement: <RouteError />, loader: () => { throw new Response('Not Found', { status: 404 }) } },
]

import { AppLayout } from '@/components/layout/AppLayout'
import { RouteError } from '@/components/RouteError'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { ComingSoon } from '@/pages/ComingSoon'

// Pages are code-split so the login screen doesn't download the dashboard.
export const routes = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
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
            path: 'attendance',
            lazy: async () => ({ Component: (await import('@/features/attendance/AttendanceReportsPage')).AttendanceReportsPage }),
            handle: { title: 'Attendance Reports' },
          },
          { path: 'students', element: <ComingSoon name="Students" />, handle: { title: 'Students' } },
          { path: 'units', element: <ComingSoon name="Units" />, handle: { title: 'Units' } },
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

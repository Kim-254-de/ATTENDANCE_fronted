import { Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { OverviewPage } from '@/features/dashboard/OverviewPage'
import { ComingSoon } from '@/pages/ComingSoon'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <OverviewPage />, handle: { title: 'Dashboard Overview' } },
          { path: 'attendance', element: <ComingSoon name="Attendance" />, handle: { title: 'Attendance' } },
          { path: 'students', element: <ComingSoon name="Students" />, handle: { title: 'Students' } },
          { path: 'units', element: <ComingSoon name="Units" />, handle: { title: 'Units' } },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

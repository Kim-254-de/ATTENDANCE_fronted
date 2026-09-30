import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useMe } from './authApi'

/** Pages only a student may open; every other signed-in page is the lecturer's. */
const STUDENT_ROUTES = new Set(['/student-profile', '/student-dashboard', '/student-units', '/student-attendance', '/student-progress', '/scan'])

export function RequireAuth() {
  const location = useLocation()
  const { data: user, isPending, error, refetch } = useMe()

  if (isPending) {
    return <div className="grid min-h-dvh place-items-center text-muted" role="status">Loading…</div>
  }
  if (error && !user) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="space-y-4">
          <p className="font-semibold text-navy-900">We couldn’t load your session.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    )
  }
  if (!user) {
    // A student page sends them to the student sign-in form (registration number, not staff number).
    return <Navigate to={STUDENT_ROUTES.has(location.pathname) ? '/login?role=student' : '/login?role=lecturer'} replace state={{ from: location.pathname }} />
  }
  const studentRoute = STUDENT_ROUTES.has(location.pathname)
  const allowed = user.role === 'lecturer' ? !studentRoute : user.role === 'student' ? studentRoute : false
  if (!allowed) {
    return <Navigate to={user.role === 'student' ? '/student-dashboard' : '/lecturer-dashboard'} replace />
  }
  return <Outlet />
}

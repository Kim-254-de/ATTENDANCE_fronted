import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useMe } from './authApi'

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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const studentRoute = location.pathname === '/student-profile' || location.pathname === '/student-dashboard'
  const allowed = user.role === 'lecturer' ? !studentRoute : user.role === 'student' ? studentRoute : false
  if (!allowed) {
    return <Navigate to={user.role === 'student' ? '/student-dashboard' : '/'} replace />
  }
  return <Outlet />
}

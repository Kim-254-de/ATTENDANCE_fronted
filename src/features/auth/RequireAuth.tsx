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
  if (user.role !== 'lecturer') {
    return <div className="grid min-h-dvh place-items-center p-6 text-center text-navy-900">This portal is for lecturers only.</div>
  }
  return <Outlet />
}

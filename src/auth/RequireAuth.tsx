import { Navigate, Outlet, useLocation, useMatches } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useMe } from './authApi'
import { roleHome } from './roleHome'

type RoleHandle = { role?: string }

/**
 * Gates every signed-in page. Which role may open a page comes from the route
 * itself — each portal's parent route declares `handle: { role }` in
 * routes.tsx — so adding a portal never means editing a list here. A route
 * with no declared role is open to any signed-in account.
 */
export function RequireAuth() {
  const location = useLocation()
  const matches = useMatches()
  const { data: user, isPending, error, refetch } = useMe()

  // The innermost declared role wins, so a nested route can narrow its parent's.
  const routeRole = [...matches].reverse().map((m) => (m.handle as RoleHandle | undefined)?.role).find(Boolean)

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
    // The sign-in form is role-specific (registration number vs staff number vs
    // department credentials), so the page's own role picks it; anything
    // role-agnostic falls back to the lecturer form, as it always has.
    return (
      <Navigate
        to={`/login?role=${routeRole ?? 'lecturer'}`}
        replace
        state={{ from: location.pathname }}
      />
    )
  }
  const allowed = !routeRole || routeRole === user.role
  if (!allowed) {
    return <Navigate to={roleHome(user.role)} replace />
  }
  return <Outlet />
}

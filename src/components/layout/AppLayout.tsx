import { Link, Outlet, useLocation, useMatches } from 'react-router-dom'
import { useMe } from '@/features/auth/authApi'
import { formatLongDate, getGreeting, firstName, initials } from '@/lib/format'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const title = [...useMatches()].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  const { data: user } = useMe()
  const onProfilePage = useLocation().pathname === '/profile'

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10">
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-navy-900">
              {title ?? (user ? `${getGreeting()}, ${firstName(user.fullName)}` : 'Dashboard')}
            </h1>
            <p className="mt-0.5 text-sm text-muted">{formatLongDate()}</p>
          </div>
          {user && !onProfilePage && (
            <Link to="/profile" aria-label="View profile" className="border-l border-line pl-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">{initials(user.fullName)}</span>
              )}
            </Link>
          )}
        </header>
        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8 lg:px-10 lg:py-9">
          <Outlet />
          <div className="h-16 lg:hidden" aria-hidden />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

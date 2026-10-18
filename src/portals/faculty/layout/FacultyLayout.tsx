import { Link, Outlet, useMatches } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { formatLongDate, getGreeting, firstName, initials } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

/**
 * Shell for the faculty portal. Desktop-first like the department portal — an
 * officer reads these tables on a laptop. The avatar opens their read-only
 * account profile.
 */
export function FacultyLayout() {
  const title = [...useMatches()].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  useDocumentTitle(title ?? 'Faculty Dashboard')
  const { data: me } = useMe()
  const user = me?.role === 'faculty' ? me : undefined

  return (
    <div className="faculty-portal flex min-h-dvh bg-teal-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-teal-100 bg-white px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10">
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-navy-900">
              {title ?? (user ? `${getGreeting()}, ${firstName(user.fullName)}` : 'Faculty')}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {user ? `${user.facultyName} · ${formatLongDate()}` : formatLongDate()}
            </p>
          </div>
          {user && (
            <Link
              to="/faculty-profile"
              aria-label="View Profile"
              title="View profile"
              className="border-l border-line pl-4 focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white" title={user.fullName}>{initials(user.fullName)}</span>
              )}
            </Link>
          )}
        </header>
        <main className="flex-1 bg-teal-50/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8 lg:px-10 lg:py-9">
          <Outlet />
          <div className="h-16 lg:hidden" aria-hidden />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

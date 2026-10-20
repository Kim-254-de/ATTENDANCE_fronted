import { Outlet, useMatches } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { officerSubtitle } from '@/components/officers/OfficerProfilePage'
import { formatLongDate, getGreeting, firstName } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

/**
 * Shell for the faculty portal. Desktop-first like the department portal — an
 * officer reads these tables on a laptop. The avatar's menu holds the
 * profile and sign-out, since phones have no sidebar.
 */
export function FacultyLayout() {
  const title = [...useMatches()].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  useDocumentTitle(title ?? 'Faculty Dashboard')
  const { data: me } = useMe()
  const user = me?.role === 'faculty' ? me : undefined

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-card px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10">
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              {title ?? (user ? `${getGreeting()}, ${firstName(user.fullName)}` : 'Faculty')}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {user ? `${user.facultyName} · ${formatLongDate()}` : formatLongDate()}
            </p>
          </div>
          {user && <AccountMenu user={user} subtitle={officerSubtitle(user)} profileTo="/faculty-profile" signOutTo="/oversight" />}
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

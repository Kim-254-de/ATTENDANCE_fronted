import { Outlet, useMatches } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { officerSubtitle } from '@/components/officers/OfficerProfilePage'
import { formatLongDate, getGreeting, firstName } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { Sidebar } from './Sidebar'

/**
 * Shell for the management portal: university-wide attendance. One
 * page tree (departments -> years -> units -> unit) moved through by tapping
 * the charts and back through the breadcrumbs, so phones need no bottom nav:
 * the avatar's menu holds the profile and sign-out.
 */
export function ManagementLayout() {
  const title = [...useMatches()].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  useDocumentTitle(title ?? 'Management')
  const { data: me } = useMe()
  const user = me?.role === 'management' ? me : undefined

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-card px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10">
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              {title ?? (user ? `${getGreeting()}, ${firstName(user.fullName)}` : 'Management')}
            </h1>
            <p className="mt-0.5 text-sm text-muted">University-wide attendance · {formatLongDate()}</p>
          </div>
          {user && <AccountMenu user={user} subtitle={officerSubtitle(user)} profileTo="/management/profile" signOutTo="/oversight" />}
        </header>
        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

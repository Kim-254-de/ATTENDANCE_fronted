import clsx from 'clsx'
import { LogOut } from 'lucide-react'
import { Link, NavLink, Outlet, useMatches, useNavigate } from 'react-router-dom'
import { useLogout, useMe } from '@/auth/authApi'
import { formatLongDate, initials } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { nav } from './nav'

/**
 * Shell for the admin console: the top of the invitation chain. Navy, so it
 * is never mistaken for the department (indigo) or faculty (teal) portals.
 */
export function AdminLayout() {
  const title = [...useMatches()].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  useDocumentTitle(title ?? 'Admin Console')
  const { data: me } = useMe()
  const user = me?.role === 'admin' ? me : undefined
  const logout = useLogout()
  const navigate = useNavigate()
  const signOut = () => logout.mutate(undefined, { onSettled: () => navigate('/oversight', { replace: true }) })

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside aria-label="Primary" className="sticky top-0 hidden h-dvh w-64 flex-col bg-navy-900 p-4 text-white lg:flex">
        <p className="px-1 py-2 text-sm text-white/70">Admin Console</p>
        <nav className="mt-6 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5')}>
              <Icon className="size-4.5" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={signOut} className="mt-auto flex w-full items-center gap-3 rounded-xl border border-red-400 px-3 py-2.5 text-sm text-red-300 transition hover:border-red-600 hover:bg-red-600 hover:text-white">
          <LogOut className="size-4.5" aria-hidden /> Sign Out
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10">
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-navy-900">{title ?? 'Admin Console'}</h1>
            <p className="mt-0.5 text-sm text-muted">{formatLongDate()}</p>
          </div>
          <button onClick={signOut} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 lg:hidden">Sign Out</button>
          {user && (
            <Link
              to="/admin-profile"
              aria-label="View Profile"
              title="View profile"
              className="grid size-10 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white transition hover:ring-2 hover:ring-navy-900/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
            >
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                : initials(user.fullName)}
            </Link>
          )}
        </header>
        <main className="flex-1 p-4 pb-24 sm:p-8 lg:px-10 lg:py-9 lg:pb-9">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx('flex flex-1 flex-col items-center gap-1 py-1 text-xs font-medium', isActive ? 'text-navy-900' : 'text-muted')}>
            <Icon className="size-5" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

import clsx from 'clsx'
import { BookOpen, ClipboardCheck, GraduationCap, LayoutGrid, LogOut, Users, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useLogout, useMe } from '@/features/auth/authApi'
import { useOverview } from '@/features/dashboard/dashboardApi'
import { formatRelative, initials } from '@/lib/format'

const nav = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/units', label: 'Units', icon: BookOpen },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: user } = useMe()
  const { data: overview } = useOverview()
  const logout = useLogout()
  const navigate = useNavigate()
  const sync = overview?.erpSync

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Primary"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-1 py-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gold-500"><GraduationCap className="size-5" aria-hidden /></span>
          <div className="flex-1 leading-tight">
            <p className="font-bold">UniLearn ERP</p>
            <p className="text-xs text-blue-200">Lecturer Portal</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Close menu"><X className="size-5" /></button>
        </div>

        {user && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-gold-500 text-sm font-bold">{initials(user.fullName)}</span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold">{user.fullName}</p>
                <p className="truncate text-xs text-sky-300">{user.department}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-2 text-xs">
              <span className="text-emerald-300">● ERP Synced</span>
              <span className="text-sky-300">{user.staffNumber}</span>
            </div>
          </div>
        )}

        <p className="mt-6 px-2 text-xs font-semibold tracking-widest text-sky-400">NAVIGATION</p>
        <nav className="mt-2 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-navy-700/60 text-white' : 'text-blue-100 hover:bg-white/5')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-[18px]" aria-hidden />
                  <span className="flex-1">{label}</span>
                  {isActive && <span className="h-5 w-1 rounded-full bg-gold-500" aria-hidden />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {sync && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs" role="status">
              <p className="font-semibold text-emerald-300">
                {sync.status === 'synced' ? 'Synced with ERP' : sync.status === 'syncing' ? 'Syncing with ERP…' : 'ERP sync failed'}
              </p>
              <p className="text-sky-300">Last: {formatRelative(sync.lastSyncedAt)}</p>
            </div>
          )}
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-blue-100 hover:bg-white/5"
          >
            <LogOut className="size-[18px]" aria-hidden /> Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

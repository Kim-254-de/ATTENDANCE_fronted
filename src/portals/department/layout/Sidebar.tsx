import clsx from 'clsx'
import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useLogout } from '@/auth/authApi'
import { nav } from './nav'

/**
 * Desktop-only (lg+) — small screens use BottomNav instead, so this never
 * needs a mobile open/close state or a hamburger trigger. Indigo rather than
 * the lecturer portal's blue: the two are different roles on the same data,
 * and an officer who also teaches should never mistake one for the other.
 */
export function Sidebar() {
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <aside
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh w-64 flex-col overflow-hidden bg-indigo-700 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-white lg:flex"
    >
      <div className="pointer-events-none absolute -right-28 -top-24 size-72 rounded-full border-28 border-white/5" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-24 size-56 rounded-full bg-indigo-800/70" aria-hidden />
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="flex-1 leading-tight">
          <p className="text-sm text-indigo-200">Department Portal</p>
        </div>
      </div>

      <p className="mt-6 px-2 text-xs font-semibold tracking-widest text-violet-300">NAVIGATION</p>
      <nav className="mt-2 space-y-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-indigo-600 text-white' : 'text-indigo-100 hover:bg-white/5')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-4.5" aria-hidden />
                <span className="flex-1">{label}</span>
                {isActive && <span className="h-5 w-1 rounded-full bg-indigo-300" aria-hidden />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <button
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login?role=department', { replace: true }) })}
          className="flex w-full items-center gap-3 rounded-xl border border-red-400 px-3 py-2.5 text-sm text-red-300 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
        >
          <LogOut className="size-4.5" aria-hidden /> Sign Out
        </button>
      </div>
    </aside>
  )
}

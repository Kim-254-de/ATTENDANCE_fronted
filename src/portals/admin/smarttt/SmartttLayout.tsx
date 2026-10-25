import clsx from 'clsx'
import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  ['terms', 'Terms'],
  ['timetable', 'Master timetable'],
  ['allocation', 'Lecturer allocation'],
  ['notifications', 'Notifications'],
  ['staff-ids', 'Staff IDs'],
  ['venues', 'Venues'],
] as const

/**
 * SMARTTT's admin functions, once its separate admin page: the timetable
 * students and lecturers see in the SMARTTT app, and the people and venues
 * behind it. SMARTTT keeps the data and checks every change; these pages
 * reach it for the signed-in administrator.
 */
export function SmartttLayout() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label="SMARTTT" className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {TABS.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                isActive ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-white/70',
              )}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

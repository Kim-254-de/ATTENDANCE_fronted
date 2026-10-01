import clsx from 'clsx'
import { BookOpen, ClipboardCheck, LayoutGrid, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const nav = [
  { to: '/lecturer-dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/units', label: 'Units', icon: BookOpen },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-blue-100 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(18,48,95,0.06)] lg:hidden"
    >
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-xs font-medium transition-colors hover:bg-blue-50">
          {({ isActive }) => (
            <>
              <Icon className={clsx('size-5', isActive ? 'text-blue-700' : 'text-muted')} aria-hidden />
              <span className={isActive ? 'text-blue-700' : 'text-muted'}>{label}</span>
              <span className={clsx('h-0.5 w-6 rounded-full', isActive ? 'bg-blue-600' : 'bg-transparent')} aria-hidden />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

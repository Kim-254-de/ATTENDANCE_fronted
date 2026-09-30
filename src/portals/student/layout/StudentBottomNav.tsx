import clsx from 'clsx'
import { History, Home, LineChart } from 'lucide-react'
import { NavLink } from 'react-router-dom'

// Units and Profile aren't tabs here: units are one tap away from Home ("My units →"),
// and Profile lives behind the avatar in the header every student page shares.
const nav = [
  { to: '/student-dashboard', label: 'Home', icon: Home },
  { to: '/student-attendance', label: 'History', icon: History },
  { to: '/student-progress', label: 'Progress', icon: LineChart },
]

/**
 * Shown at every viewport width — the student portal is mobile-first, unlike the lecturer's
 * desktop-sidebar layout. Capped at the same phone width as StudentLayout and centered, so on a
 * wide screen it stays attached to the bottom of the phone-frame column instead of spanning the
 * whole browser window.
 */
export function StudentBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-line bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:border-x sm:shadow-xl"
    >
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="flex flex-1 flex-col items-center gap-1 px-1 py-1 text-xs font-medium">
          {({ isActive }) => (
            <>
              <Icon className={clsx('size-5', isActive ? 'text-navy-900' : 'text-muted')} aria-hidden />
              <span className={isActive ? 'text-navy-900' : 'text-muted'}>{label}</span>
              <span className={clsx('h-0.5 w-6 rounded-full', isActive ? 'bg-gold-500' : 'bg-transparent')} aria-hidden />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

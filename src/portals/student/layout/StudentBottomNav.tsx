import clsx from 'clsx'
import { BookOpen, History, Home, LineChart, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

// Five tabs, every one always useful. Course evaluations are seasonal, so they surface on Home and
// Units only while a round is open (EvaluationPrompt) instead of holding a tab that is empty most of the term.
const nav = [
  { to: '/student-dashboard', label: 'Home', icon: Home },
  { to: '/student-units', label: 'Units', icon: BookOpen },
  { to: '/student-attendance', label: 'History', icon: History },
  { to: '/student-progress', label: 'Progress', icon: LineChart },
  { to: '/student-profile', label: 'Profile', icon: UserRound },
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
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-line bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(18,48,95,0.06)] sm:border-x"
    >
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-xs font-medium transition-colors hover:bg-brand-soft focus-visible:outline-brand-ink">
          {({ isActive }) => (
            <>
              <Icon className={clsx('size-5', isActive ? 'text-brand-ink' : 'text-muted')} aria-hidden />
              <span className={isActive ? 'text-brand-ink' : 'text-muted'}>{label}</span>
              <span className={clsx('h-0.5 w-6 rounded-full', isActive ? 'bg-brand' : 'bg-transparent')} aria-hidden />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

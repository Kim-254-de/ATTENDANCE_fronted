import { Link, Outlet, useLocation } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { getGreeting, initials } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { StudentBottomNav } from './StudentBottomNav'

/**
 * Shared shell for the student portal: the navy header banner every student
 * page used to render on its own, plus a persistent bottom nav. Single
 * column and mobile-first (no desktop sidebar) — unlike the lecturer's
 * AppLayout, since a student's main action (scanning a QR code) is a phone
 * activity. On a wider viewport the column caps at phone width and centers,
 * with a border/shadow marking it as a deliberate phone-frame rather than a
 * mobile layout that just never got a desktop pass.
 */
export function StudentLayout() {
  useDocumentTitle('Student Dashboard')
  const { data: me } = useMe()
  const user = me?.role === 'student' ? me : undefined
  const onProfilePage = useLocation().pathname === '/student-profile'

  return (
    <div className="min-h-dvh bg-surface sm:bg-line/60">
      <div className="mx-auto min-h-dvh max-w-md space-y-6 bg-surface p-4 pb-20 sm:border-x sm:border-line sm:p-8 sm:pb-20 sm:shadow-xl">
        <header className="flex items-center gap-3 rounded-2xl bg-navy-900 px-5 py-4 text-white shadow-lg sm:px-7">
          <div><p className="font-bold">{user ? getGreeting() : 'Smart Attendance'}</p><p className="text-sm text-blue-200">{user ? user.fullName : 'Student Portal'}</p></div>
          {user && !onProfilePage && (
            <Link to="/student-profile" aria-label="My profile" className="ml-auto flex items-center text-white hover:text-gold-300">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
              ) : (
                <span className="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-semibold">{initials(user.fullName)}</span>
              )}
            </Link>
          )}
        </header>
        <Outlet />
      </div>
      <StudentBottomNav />
    </div>
  )
}

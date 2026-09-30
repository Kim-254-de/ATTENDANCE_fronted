import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { getGreeting, initials } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { StudentBottomNav } from './StudentBottomNav'

const DOUBLE_TAP_MS = 300

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
  const [headerHidden, setHeaderHidden] = useState(false)
  const lastTapAt = useRef(0)

  useEffect(() => {
    // The header is only allowed to stay hidden away from the top — snap it back once scrolled there.
    const onScroll = () => {
      if (window.scrollY <= 0) setHeaderHidden(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // A double-tap anywhere on the page toggles the header, except on its own controls (the profile
  // link) which already have a single-tap job. No-ops at the top of the page — see the scroll guard above.
  const onDoubleTapArea = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a,button,input,select,textarea')) return
    const now = Date.now()
    const isDoubleTap = now - lastTapAt.current < DOUBLE_TAP_MS
    lastTapAt.current = isDoubleTap ? 0 : now
    if (isDoubleTap && window.scrollY > 0) setHeaderHidden((hidden) => !hidden)
  }

  return (
    <div className="min-h-dvh bg-surface sm:bg-line/60">
      <div onClick={onDoubleTapArea} className="mx-auto min-h-dvh max-w-md space-y-6 bg-surface p-4 pb-20 sm:border-x sm:border-line sm:p-8 sm:pb-20 sm:shadow-xl">
        {!onProfilePage && (
          <header
            className={`sticky top-0 z-20 flex items-center gap-3 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 py-4 text-white shadow-lg transition-transform duration-300 ease-in-out sm:px-7 ${headerHidden ? '-translate-y-[150%]' : 'translate-y-0'}`}
          >
            <div><p className="font-bold">{user ? getGreeting() : 'Smart Attendance'}</p><p className="text-sm text-blue-200">{user ? user.fullName : 'Student Portal'}</p></div>
            {user && (
              <Link to="/student-profile" aria-label="My profile" className="ml-auto flex items-center text-white hover:text-gold-300">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                  <span className="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-semibold">{initials(user.fullName)}</span>
                )}
              </Link>
            )}
          </header>
        )}
        <Outlet />
      </div>
      <StudentBottomNav />
    </div>
  )
}

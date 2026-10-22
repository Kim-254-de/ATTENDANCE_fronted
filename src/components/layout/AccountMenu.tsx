import { LogOut, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogout } from '@/auth/authApi'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { initials } from '@/lib/format'

interface Props {
  user: { fullName: string; email: string; avatarUrl: string | null }
  /** Shown under the name, e.g. "Department officer · Computer Science". */
  subtitle: string
  profileTo: string
  /** Where signing out lands: the sign-in page this role uses. */
  signOutTo: string
}

/**
 * The avatar at the top right of every officer portal, on every screen size. Desktop also has
 * Sign Out in the sidebar, but phones and tablets have no sidebar, so this is the one place
 * that always reaches the profile and sign-out.
 */
export function AccountMenu({ user, subtitle, profileTo, signOutTo }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const logout = useLogout()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  const itemClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition'

  return (
    <div ref={ref} className="relative flex items-center gap-2 border-l border-line pl-4">
      <ThemeToggle />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        title={user.fullName}
        className="block rounded-full focus-visible:outline-offset-2"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-brand text-sm font-bold text-white">{initials(user.fullName)}</span>
        )}
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-12 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-2 shadow-xl">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{subtitle}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="pt-2">
            <Link to={profileTo} onClick={() => setOpen(false)} className={`${itemClass} text-ink hover:bg-surface`}>
              <UserRound className="size-4.5" aria-hidden /> My profile
            </Link>
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate(signOutTo, { replace: true }) })}
              className={`${itemClass} text-danger hover:bg-danger-soft`}
            >
              <LogOut className="size-4.5" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

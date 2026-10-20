import clsx from 'clsx'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, matchPath, useLocation } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type Tone = 'indigo' | 'teal' | 'violet'

// Written out in full so Tailwind sees every class.
const TONES: Record<Tone, { border: string; hover: string; text: string; bar: string; sheetActive: string }> = {
  indigo: { border: 'border-indigo-100', hover: 'hover:bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-700', sheetActive: 'bg-indigo-50 text-indigo-700' },
  teal: { border: 'border-teal-100', hover: 'hover:bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-700', sheetActive: 'bg-teal-50 text-teal-700' },
  violet: { border: 'border-violet-100', hover: 'hover:bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-700', sheetActive: 'bg-violet-50 text-violet-700' },
}

/** Five tabs is as many as fit a phone's width with readable labels. */
const MAX_TABS = 5

/**
 * The small-screen counterpart to a portal's Sidebar; both render the same `nav` array. With more
 * pages than fit, the first four stay as tabs and the rest go behind "More", so labels never
 * shrink to the point of being unreadable on a phone.
 */
export function PortalBottomNav({ items, tone }: { items: NavItem[]; tone: Tone }) {
  const t = TONES[tone]
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const tabs = items.length > MAX_TABS ? items.slice(0, MAX_TABS - 1) : items
  const overflow = items.length > MAX_TABS ? items.slice(MAX_TABS - 1) : []
  const overflowActive = overflow.some((i) => matchPath({ path: i.to, end: !!i.end }, pathname))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (!sheetRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  const tabClass = clsx('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-xs font-medium transition-colors', t.hover)
  const content = (Icon: LucideIcon, label: string, active: boolean) => (
    <>
      <Icon className={clsx('size-5', active ? t.text : 'text-muted')} aria-hidden />
      <span className={clsx('max-w-full truncate text-center leading-tight', active ? t.text : 'text-muted')}>{label}</span>
      <span className={clsx('h-0.5 w-6 rounded-full', active ? t.bar : 'bg-transparent')} aria-hidden />
    </>
  )

  return (
    <div ref={sheetRef} className="lg:hidden">
      {open && (
        <div id="more-pages" className={clsx('fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border bg-white p-2 shadow-xl', t.border)}>
          {overflow.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? t.sheetActive : 'text-navy-900 hover:bg-surface')}
            >
              <Icon className="size-4.5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      )}
      <nav
        aria-label="Primary"
        className={clsx('fixed inset-x-0 bottom-0 z-20 flex border-t bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(18,48,95,0.06)]', t.border)}
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            {({ isActive }) => content(Icon, label, isActive)}
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="more-pages" className={tabClass}>
            {content(MoreHorizontal, 'More', open || overflowActive)}
          </button>
        )}
      </nav>
    </div>
  )
}

import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { useMe } from '@/features/auth/authApi'
import { useOverview } from '@/features/dashboard/dashboardApi'
import { formatLongDate, initials } from '@/lib/format'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const title = [...useMatches()].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  const [open, setOpen] = useState(false)
  const { data: user } = useMe()
  const { data: overview } = useOverview()

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-surface lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-[0.16em] text-gold-600">UNILEARN ERP</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-navy-900">{title ?? 'Dashboard Overview'}</h1>
            <p className="mt-0.5 text-sm text-muted">{formatLongDate()}</p>
          </div>
          {overview?.erpSync.status === 'synced' && (
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-success sm:inline-flex">
              <span className="size-1.5 rounded-full bg-success" aria-hidden /> ERP Live
            </span>
          )}
          {user && (
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <span className="grid size-10 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">{initials(user.fullName)}</span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-navy-900">{user.fullName}</p>
                <p className="text-xs text-muted">{user.staffNumber}</p>
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8 lg:px-10 lg:py-9">
          <Outlet />
          <div className="h-16 lg:hidden" aria-hidden />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

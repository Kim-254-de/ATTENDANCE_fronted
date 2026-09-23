import { ArrowUpRight, BookOpen, ClipboardCheck, Plus, Radio, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivateClass } from '@/features/attendance/ActivateClass'
import { getActiveSessionId, useSessionQr } from '@/features/attendance/sessionApi'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { useMe } from '@/features/auth/authApi'
import { errorMessage } from '@/lib/api'
import { RecentSessions } from './RecentSessions'
import { useOverview, useUnits } from './dashboardApi'

/**
 * A lecturer opens this between classes, mid-walk to the lecture hall. It
 * leads with the one action that's actually urgent — activating the class —
 * and keeps everything else one glance, not a read.
 */
export function OverviewPage() {
  const { data: user } = useMe()
  const { data, isPending, error, refetch } = useOverview()
  const [activeSessionId] = useState(getActiveSessionId)
  const firstName = user?.fullName.replace(/^\S+\.?\s*/, '').split(' ')[0] ?? 'Lecturer'

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 px-5 py-6 text-white shadow-[0_12px_30px_rgba(18,48,95,0.16)] sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[32px] border-white/5" aria-hidden />
        <div className="pointer-events-none absolute bottom-[-5rem] right-32 size-44 rounded-full bg-gold-500/10" aria-hidden />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-sky-300">LECTURER WORKSPACE</p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Good morning, {firstName}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Stay on top of your classes, monitor attendance, and keep every student connected to the learning journey.</p>
          </div>
          <Link to="/attendance" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-gold-600">
            <ClipboardCheck className="size-4" aria-hidden /> Open attendance
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {activeSessionId && <ActiveSessionBanner sessionId={activeSessionId} />}

      <ActivateClass />

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load your statistics.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : (
        <section aria-label="Key statistics" className="grid grid-cols-2 gap-4">
          {isPending || !data ? (
            Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
          ) : (
            <>
              <StatCard icon={ClipboardCheck} label="Avg. Attendance" value={`${data.avgAttendance.toFixed(1)}%`} hint="This semester" accent />
              <StatCard icon={BookOpen} label="Sessions Held" value={data.sessionsHeld} hint={data.periodLabel} />
            </>
          )}
        </section>
      )}

      <section aria-label="Quick actions" className="grid grid-cols-3 gap-3">
        <QuickAction to="/attendance" icon={ClipboardCheck} label="Reports" />
        <QuickAction to="/students" icon={UserRound} label="Students" />
        <QuickAction to="/units" icon={Plus} label="Add Unit" />
      </section>

      <RecentSessions limit={3} />
    </div>
  )
}

function ActiveSessionBanner({ sessionId }: { sessionId: string }) {
  const qr = useSessionQr(sessionId)
  const { data: units } = useUnits()
  const capacity = units?.find((u) => u.id === qr.data?.session.unitId)?.studentCount

  return (
    <Link to={`/session/${sessionId}`} className="block">
      <Card className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-success"><Radio className="size-5" aria-hidden /></span>
        <span className="flex-1 leading-tight">
          <span className="block font-semibold text-navy-900">Class in progress</span>
          <span className="text-sm text-muted">
            {qr.data ? `${qr.data.checkedIn}${capacity !== undefined ? `/${capacity}` : ''} checked in — tap to reopen` : 'Tap to reopen the live QR code'}
          </span>
        </span>
        <span className="text-muted" aria-hidden>›</span>
      </Card>
    </Link>
  )
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Plus; label: string }) {
  return (
    <Link to={to} className="block">
      <Card className="flex flex-col items-center gap-2 p-4 text-center transition hover:shadow-md">
        <span className="grid size-11 place-items-center rounded-xl bg-navy-900/5 text-navy-800"><Icon className="size-5" aria-hidden /></span>
        <span className="text-sm font-medium text-navy-900">{label}</span>
      </Card>
    </Link>
  )
}

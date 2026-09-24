import { BookOpen, ClipboardCheck, Plus, Radio, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivateClass } from '@/features/attendance/ActivateClass'
import { getActiveSessionId, useSessionQr } from '@/features/attendance/sessionApi'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { errorMessage } from '@/lib/api'
import { RecentSessions } from './RecentSessions'
import { useOverview } from './dashboardApi'

/**
 * A lecturer opens this between classes, mid-walk to the lecture hall. It
 * leads with the one action that's actually urgent — activating the class —
 * and keeps everything else one glance, not a read.
 */
export function OverviewPage() {
  const { data, isPending, error, refetch } = useOverview()
  const [activeSessionId] = useState(getActiveSessionId)

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
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
              <StatCard icon={ClipboardCheck} label="Avg. Attendance" value={`${data.avgAttendance.toFixed(1)}%`} hint={data.periodLabel} accent />
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
  const capacity = qr.data?.enrolled

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

import { BookOpen, ClipboardCheck, MapPin, Plus, Radio, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivateClass } from '@/portals/lecturer/attendance/ActivateClass'
import { useLiveSessions, useSessionQr } from '@/portals/lecturer/attendance/sessionApi'
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
  // Classes running on any device signed in to this account, e.g. the laptop in the lecture hall.
  const live = useLiveSessions()

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {live.data?.map((session) =>
        session.geofence.mode === 'AWAITING_LOCATION'
          ? <AwaitingLocationBanner key={session.id} sessionId={session.id} unitCode={session.unitCode} />
          : <ActiveSessionBanner key={session.id} sessionId={session.id} />,
      )}

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

/** On the lecturer's phone: the class their laptop opened is waiting for this phone's location. */
function AwaitingLocationBanner({ sessionId, unitCode }: { sessionId: string; unitCode: string }) {
  return (
    <Link to={`/session/${sessionId}/locate`} className="block">
      <Card className="flex items-center gap-3 border border-amber-200 bg-amber-50 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600"><MapPin className="size-5" aria-hidden /></span>
        <span className="flex-1 leading-tight">
          <span className="block font-semibold text-navy-900">{unitCode} is waiting for its location</span>
          <span className="text-sm text-muted">Tap to share location from this phone, standing in the room</span>
        </span>
        <span className="text-muted" aria-hidden>›</span>
      </Card>
    </Link>
  )
}

function ActiveSessionBanner({ sessionId }: { sessionId: string }) {
  const qr = useSessionQr(sessionId)
  const capacity = qr.data?.enrolled

  return (
    <Link to={`/session/${sessionId}`} className="block">
      <Card className="flex items-center gap-3 border border-blue-200 bg-blue-50 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700"><Radio className="size-5" aria-hidden /></span>
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
        <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-800"><Icon className="size-5" aria-hidden /></span>
        <span className="text-sm font-medium text-navy-900">{label}</span>
      </Card>
    </Link>
  )
}

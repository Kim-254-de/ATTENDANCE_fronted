import { BookOpen, CalendarDays, ClipboardCheck, Plus, RefreshCw, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { errorMessage } from '@/lib/api'
import { QrGenerator } from '@/features/attendance/QrGenerator'
import { formatDateTime } from '@/lib/format'
import { RecentSessions } from './RecentSessions'
import { useOverview } from './dashboardApi'

export function OverviewPage() {
  const { data, isPending, error, refetch } = useOverview()

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load your statistics.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : (
        <section aria-label="Key statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isPending || !data ? (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
          ) : (
            <>
              <StatCard icon={Users} label="Total Students" value={data.totalStudents} hint={`Across ${data.unitsTaught} units`} />
              <StatCard icon={ClipboardCheck} label="Avg. Attendance" value={`${data.avgAttendance.toFixed(1)}%`} hint="This semester" accent />
              <StatCard icon={BookOpen} label="Units Taught" value={data.unitsTaught} hint="Current semester" />
              <StatCard icon={CalendarDays} label="Sessions Held" value={data.sessionsHeld} hint={data.periodLabel} />
            </>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <QrGenerator />
        <section aria-label="Quick actions" className="space-y-4">
          <QuickAction to="/attendance" icon={ClipboardCheck} title="Attendance Reports" hint="View & export class records" />
          <QuickAction to="/students" icon={UserRound} title="Allocated Students" hint="Browse student roster" />
          <QuickAction to="/units" icon={Plus} title="Add New Unit" hint="Register a course unit" highlight />
          <Card className="space-y-1 p-5 text-sm">
            <p className={`flex items-center gap-2 font-semibold ${data?.erpSync.status === 'failed' ? 'text-red-600' : 'text-success'}`}>
              <RefreshCw className="size-4" aria-hidden />
              {data?.erpSync.status === 'failed' ? 'ERP Sync Failed' : data?.erpSync.status === 'syncing' ? 'ERP Syncing…' : 'ERP System Synced'}
            </p>
            <p className="text-muted">Lecturer profile, unit roster, and student records are live-synced with the university database.</p>
            {data && <p className="pt-1 text-xs text-muted">Last sync: {formatDateTime(data.erpSync.lastSyncedAt)}</p>}
          </Card>
        </section>
      </div>

      <RecentSessions />
    </div>
  )
}

function QuickAction({ to, icon: Icon, title, hint, highlight }: { to: string; icon: typeof Plus; title: string; hint: string; highlight?: boolean }) {
  return (
    <Link to={to} className="block">
      <Card className={`flex items-center gap-4 p-4 transition hover:shadow-md ${highlight ? 'border border-gold-500/50' : ''}`}>
        <span className={`grid size-11 place-items-center rounded-xl ${highlight ? 'bg-gold-100 text-gold-600' : 'bg-navy-900/5 text-navy-800'}`}><Icon className="size-5" aria-hidden /></span>
        <span className="flex-1 leading-tight">
          <span className="block font-semibold text-navy-900">{title}</span>
          <span className="text-sm text-muted">{hint}</span>
        </span>
        <span className="text-muted" aria-hidden>›</span>
      </Card>
    </Link>
  )
}

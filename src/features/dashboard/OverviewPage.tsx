import { Activity, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { useMe } from '@/features/auth/authApi'
import { errorMessage } from '@/lib/api'
import { QrGenerator } from '@/features/attendance/QrGenerator'
import { formatDateTime, initials } from '@/lib/format'
import { RecentSessions } from './RecentSessions'
import { useOverview, useUnits } from './dashboardApi'

export function OverviewPage() {
  const { data: user } = useMe()
  const { data, isPending, error, refetch } = useOverview()
  const { data: units, isPending: unitsPending } = useUnits()
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

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-gold-600">PERFORMANCE SNAPSHOT</p>
          <h2 className="mt-1 text-lg font-bold text-navy-900">Your teaching at a glance</h2>
        </div>
        {user && <span className="hidden size-9 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white sm:grid" aria-label={`Signed in as ${user.fullName}`}>{initials(user.fullName)}</span>}
      </div>
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
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted">TEACHING ROSTER</p>
                <h2 className="mt-1 font-semibold text-navy-900">Allocated units</h2>
              </div>
              <Link to="/units" aria-label="View all units" className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-navy-900"><ArrowUpRight className="size-4" /></Link>
            </div>
            <div className="divide-y divide-line">
              {unitsPending ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="mx-5 my-4 h-10" />) : units?.slice(0, 4).map((unit) => (
                <div key={unit.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900/5 text-navy-800"><BookOpen className="size-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{unit.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{unit.code} · {unit.studentCount} students</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-success">Active</span>
                </div>
              ))}
            </div>
            <Link to="/units" className="flex items-center justify-center gap-1 border-t border-line px-5 py-3 text-xs font-semibold text-navy-800 hover:bg-surface">Manage all units <ArrowUpRight className="size-3.5" /></Link>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-success"><Activity className="size-5" aria-hidden /></span>
              <div>
                <p className="font-semibold text-navy-900">System health</p>
                <p className="text-xs text-muted">Your workspace is up to date</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <HealthRow icon={CheckCircle2} label="ERP data synchronisation" value={data?.erpSync.status === 'failed' ? 'Needs attention' : 'Operational'} bad={data?.erpSync.status === 'failed'} />
              <HealthRow icon={Clock3} label="Last data refresh" value={data ? formatDateTime(data.erpSync.lastSyncedAt) : 'Loading…'} />
            </div>
          </Card>
        </div>
      </div>

      <RecentSessions />
    </div>
  )
}

function HealthRow({ icon: Icon, label, value, bad }: { icon: typeof CheckCircle2; label: string; value: string; bad?: boolean }) {
  return <div className="flex items-center gap-2"><Icon className={`size-4 ${bad ? 'text-red-600' : 'text-success'}`} aria-hidden /><span className="flex-1 text-muted">{label}</span><span className={`text-xs font-semibold ${bad ? 'text-red-600' : 'text-navy-900'}`}>{value}</span></div>
}

import { BookOpen, Building2, ClipboardCheck, GraduationCap, Radio, Timer, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { errorMessage } from '@/lib/api'
import { useFacultyProfile, useOverview } from './dashboardApi'

/**
 * What a faculty officer wants in one glance: how big the faculty is, how
 * well its classes are attended, and whether they start on time — the
 * department dashboard widened by one department count. Every number here
 * drills down through the nav; nothing on this page is an action.
 */
export function OverviewPage() {
  const { data, isPending, error, refetch } = useOverview()
  const faculty = useFacultyProfile()

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Attendance across every department in {faculty.data?.facultyName ?? 'your faculty'}, and how punctually its classes are opened.
      </p>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load the faculty overview.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : (
        <section aria-label="Key statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isPending || !data ? (
            Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
          ) : (
            <>
              <StatCard icon={Building2} label="Departments" value={data.departmentCount} hint="In this faculty" />
              <StatCard icon={GraduationCap} label="Lecturers" value={data.lecturerCount} hint="Teaching this semester" />
              <StatCard icon={Users} label="Students" value={data.studentCount} hint="On a unit in this faculty" />
              <StatCard icon={BookOpen} label="Units" value={data.unitCount} hint="Taught in this faculty" />
              <StatCard icon={ClipboardCheck} label="Avg. Attendance" value={`${data.avgAttendanceRate.toFixed(1)}%`} hint="All units, semester to date" accent />
              <StatCard icon={Radio} label="Sessions Held" value={data.sessionsHeld} hint="All time" />
              <StatCard icon={Timer} label="On-Time Rate" value={data.onTimeRate === null ? '—' : `${data.onTimeRate.toFixed(1)}%`} hint="Classes opened at their scheduled start" accent />
            </>
          )}
        </section>
      )}

      <section aria-label="Explore" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/faculty-departments" icon={Building2} label="Departments" hint="Compare load and attendance" />
        <QuickLink to="/faculty-lecturers" icon={GraduationCap} label="Lecturers" hint="Load, attendance and punctuality" />
        <QuickLink to="/faculty-students" icon={Users} label="Students" hint="Every student, every unit" />
        <QuickLink to="/faculty-units" icon={BookOpen} label="Units" hint="Who teaches what, and how well attended" />
      </section>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label, hint }: { to: string; icon: typeof BookOpen; label: string; hint: string }) {
  return (
    <Link to={to} className="block">
      <Card className="flex items-center gap-3 p-5 transition hover:shadow-md">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="size-5" aria-hidden /></span>
        <span className="min-w-0 leading-tight">
          <span className="block font-semibold text-navy-900">{label}</span>
          <span className="text-xs text-muted">{hint}</span>
        </span>
      </Card>
    </Link>
  )
}

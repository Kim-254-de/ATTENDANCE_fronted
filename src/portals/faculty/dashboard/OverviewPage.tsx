import { BookOpen, Building2, ClipboardCheck, GraduationCap, Radio, Timer, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { errorMessage } from '@/lib/api'
import { useOverview } from './dashboardApi'

/**
 * What a faculty officer wants in one glance: how big the faculty is, how
 * well its classes are attended, and whether they start on time — the
 * department dashboard widened by one department count. Every number here
 * drills down through the nav; nothing on this page is an action.
 */
export function OverviewPage() {
  const { data, isPending, error, refetch } = useOverview()

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
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

    </div>
  )
}

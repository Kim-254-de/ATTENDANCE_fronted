import { CalendarCheck, ChevronRight, Clock3, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { useMe } from '@/features/auth/authApi'
import { initials } from '@/lib/format'

export function StudentDashboardPage() {
  const { data: user } = useMe()
  if (!user) return null

  return (
    <main className="min-h-dvh bg-surface p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3 rounded-2xl bg-navy-900 px-5 py-4 text-white shadow-lg sm:px-7">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500"><GraduationCap className="size-6" aria-hidden /></span>
          <div><p className="font-bold">UniLearn ERP</p><p className="text-sm text-blue-200">Student Portal</p></div>
          <Link to="/student-profile" className="ml-auto flex items-center gap-2 text-sm font-semibold text-white hover:text-gold-300"><span className="grid size-9 place-items-center rounded-full bg-white/15">{initials(user.fullName)}</span><span className="hidden sm:inline">My profile</span></Link>
        </header>
        <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-8">
          <p className="text-sm font-semibold text-gold-600">STUDENT WORKSPACE</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Good morning, {user.fullName.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').split(' ')[0]}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Your attendance record and upcoming academic activity are ready for review.</p>
        </section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<CalendarCheck className="size-5" />} label="Attendance rate" value="92%" detail="This semester" />
          <Stat icon={<Clock3 className="size-5" />} label="Sessions attended" value="24 / 26" detail="Current term" />
          <Stat icon={<GraduationCap className="size-5" />} label="Programme" value="Computer Science" detail="Active student" />
        </div>
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-gold-600">NEXT SESSION</p><h2 className="mt-1 text-xl font-bold text-navy-900">Data Structures &amp; Algorithms</h2><p className="mt-1 text-sm text-muted">CS301 · Today at 08:00</p></div><span className="hidden size-12 place-items-center rounded-xl bg-gold-100 text-gold-600 sm:grid"><CalendarCheck className="size-6" /></span></div>
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-muted">Attendance is recorded by your lecturer at the start of class.</p><Link to="/student-profile" className="inline-flex items-center gap-1 font-semibold text-navy-900 hover:text-gold-600">View profile <ChevronRight className="size-4" /></Link></div>
        </Card>
      </div>
    </main>
  )
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="p-5"><span className="grid size-10 place-items-center rounded-xl bg-gold-100 text-gold-600">{icon}</span><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className="mt-1 truncate text-xl font-bold text-navy-900">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></Card>
}
import { ArrowLeft, BookOpen, GraduationCap, LogOut, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { initials } from '@/lib/format'
import { ChangePasswordCard } from '@/auth/ChangePasswordCard'
import { useLogout, useMe } from '@/auth/authApi'

/**
 * A student's own details. Read-only: name, email and registration number are
 * what the student records check verified at registration, so they aren't
 * editable here (ask the registrar). The password can be changed.
 */
export function StudentProfilePage() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = me?.role === 'student' ? me : undefined
  if (!user) return null

  const signOut = () => logout.mutate(undefined, { onSettled: () => navigate('/login?role=student', { replace: true }) })

  return (
    <main className="min-h-dvh bg-surface p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center gap-3 rounded-2xl bg-navy-900 px-5 py-4 text-white shadow-lg sm:px-7">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500"><GraduationCap className="size-6" aria-hidden /></span>
          <div><p className="font-bold">Smart Attendance</p><p className="text-sm text-blue-200">Student Portal</p></div>
          <span className="ml-auto font-mono text-sm text-blue-200">{user.registrationNumber}</span>
        </header>
        <Link to="/student-dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy-900">
          <ArrowLeft className="size-4" aria-hidden /> Dashboard
        </Link>
        <div>
          <p className="text-sm font-semibold text-gold-600">ACCOUNT</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Student profile</h1>
          <p className="mt-2 text-sm text-muted">These details come from the student records. If something is wrong, contact the registrar.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="h-fit overflow-hidden">
            <div className="bg-navy-900 px-6 pb-7 pt-6 text-white">
              <div className="grid size-20 place-items-center rounded-2xl bg-gold-500 text-2xl font-bold">{initials(user.fullName)}</div>
              <p className="mt-5 text-xl font-bold">{user.fullName}</p>
              <p className="mt-1 text-sm text-blue-200">{user.programme ?? 'Programme not recorded'}</p>
            </div>
            <div className="space-y-4 p-6">
              <Info icon={<Mail className="size-5" />} label="Email" value={user.email} />
              <Info icon={<BookOpen className="size-5" />} label="Year of study" value={user.yearOfStudy ? `Year ${user.yearOfStudy}` : 'Not recorded'} />
              <Info icon={<ShieldCheck className="size-5 text-success" />} label="Account status" value="Active and verified" valueClass="text-success" />
              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Registration number</p>
                <p className="mt-1 font-mono text-sm font-semibold text-navy-900">{user.registrationNumber}</p>
              </div>
              <Button variant="secondary" className="w-full" loading={logout.isPending} onClick={signOut}>
                <LogOut className="size-4" aria-hidden /> Sign out
              </Button>
            </div>
          </Card>
          <ChangePasswordCard />
        </div>
      </div>
    </main>
  )
}

function Info({ icon, label, value, valueClass = 'text-ink' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return <div className="flex items-start gap-3">{icon}<div><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className={`mt-1 break-all text-sm font-medium ${valueClass}`}>{value}</p></div></div>
}

import { GraduationCap, Presentation } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { AuthShell } from '@/auth/AuthShell'

/** The site root: an already-signed-in visitor is sent straight to their dashboard; everyone else picks a role. */
export function LandingPage() {
  const { data: me } = useMe()
  const navigate = useNavigate()

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/lecturer-dashboard'} replace />

  return (
    <AuthShell title="Welcome to Smart Attendance" subtitle="Choose how you'd like to sign in.">
      <div className="grid gap-4 sm:grid-cols-2">
        <RoleCard
          icon={<Presentation className="size-7" aria-hidden />}
          label="I'm a Lecturer"
          detail="Manage units, run attendance sessions and view reports."
          onClick={() => navigate('/login?role=lecturer')}
        />
        <RoleCard
          icon={<GraduationCap className="size-7" aria-hidden />}
          label="I'm a Student"
          detail="Scan the QR code in class and track your attendance."
          onClick={() => navigate('/login?role=student')}
        />
      </div>
    </AuthShell>
  )
}

function RoleCard({ icon, label, detail, onClick }: { icon: React.ReactNode; label: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-line bg-white p-6 text-left shadow-[0_1px_3px_rgba(18,48,95,0.08)] transition-transform hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-gold-100 text-gold-600">{icon}</span>
      <span className="font-bold text-navy-900">{label}</span>
      <span className="text-sm text-muted">{detail}</span>
    </button>
  )
}

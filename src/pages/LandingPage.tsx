import { Navigate, useNavigate } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { AuthShell } from '@/auth/AuthShell'
import { roleHome } from '@/auth/roleHome'

/**
 * The site root: an already-signed-in visitor is sent straight to their
 * dashboard; everyone else picks a role. Only the roles anyone may use are
 * offered — administrators and officers sign in at /oversight, which their
 * invitation email links to.
 */
export function LandingPage() {
  const { data: me } = useMe()
  const navigate = useNavigate()

  if (me) return <Navigate to={roleHome(me.role)} replace />

  return (
    <AuthShell title="Welcome to Smart Attendance" subtitle="Choose how you'd like to sign in.">
      <div className="grid gap-4 sm:grid-cols-2">
        <RoleCard
          picture={<StudentPicture />}
          tile="bg-brand-soft text-brand-ink"
          label="I'm a Student"
          detail="Scan the QR code in class and track your attendance."
          onClick={() => navigate('/login?role=student')}
        />
        <RoleCard
          picture={<LecturerPicture />}
          tile="bg-accent-soft text-accent-ink"
          label="I'm a Lecturer"
          detail="Manage units, run attendance sessions and view reports."
          onClick={() => navigate('/login?role=lecturer')}
        />
      </div>
    </AuthShell>
  )
}

/**
 * Large pictures so the two roles tell apart before anyone reads: a student in a graduation cap,
 * a lecturer pointing at a board. Student comes first, in the same order as SMARTTT's role picker.
 * Shape carries the difference; the tile tint only reinforces it.
 */
function RoleCard({ picture, tile, label, detail, onClick }: { picture: React.ReactNode; tile: string; label: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center shadow-[0_1px_3px_rgba(18,48,95,0.08)] transition-transform hover:scale-[1.01] hover:shadow-md active:scale-[0.99]"
    >
      <span className={`grid size-24 place-items-center rounded-3xl ${tile}`}>{picture}</span>
      <span className="text-lg font-bold text-ink">{label}</span>
      <span className="text-sm text-muted">{detail}</span>
    </button>
  )
}

const pictureProps = {
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'size-16',
  'aria-hidden': true,
} as const

function StudentPicture() {
  return (
    <svg {...pictureProps}>
      <path d="M24 4 42 11 24 18 6 11Z" fill="currentColor" fillOpacity={0.15} />
      <path d="M14 14.5v5c3 3 17 3 20 0v-5" />
      <path d="M40 12v8" />
      <circle cx="40" cy="22" r="1.5" fill="currentColor" />
      <circle cx="24" cy="27" r="5.5" />
      <path d="M12 45c0-7 5-11.5 12-11.5S36 38 36 45" />
    </svg>
  )
}

function LecturerPicture() {
  return (
    <svg {...pictureProps}>
      <rect x="20" y="5" width="25" height="19" rx="2" fill="currentColor" fillOpacity={0.15} />
      <path d="M25 11h10M25 17h15" />
      <circle cx="11" cy="21" r="5" />
      <path d="M2.5 45c0-8 3.5-13.5 8.5-13.5s8.5 5.5 8.5 13.5" />
      <path d="M16 33 27 21" />
    </svg>
  )
}

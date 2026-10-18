import { Mail, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useMe } from '@/auth/authApi'
import { initials } from '@/lib/format'

export function FacultyProfilePage() {
  const { data: me } = useMe()
  const user = me?.role === 'faculty' ? me : undefined

  if (!user) return null

  return (
    <div className="mx-auto max-w-xl">
      <Card className="overflow-hidden">
        <div className="bg-teal-700 px-5 py-6 text-white sm:px-6">
          <div className="flex items-center gap-4">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="size-16 rounded-2xl object-cover" />
              : <span className="grid size-16 place-items-center rounded-2xl bg-white/15 text-xl font-bold">{initials(user.fullName)}</span>}
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">{user.fullName}</h2>
              <p className="mt-1 text-sm text-white/80">Faculty Officer</p>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-muted" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className={`mt-0.5 size-5 ${user.status === 'ACTIVE' ? 'text-success' : 'text-orange-600'}`} aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p>
              <p className={`mt-1 text-sm font-medium ${user.status === 'ACTIVE' ? 'text-success' : 'text-orange-600'}`}>
                {user.status === 'ACTIVE' ? 'Active' : user.status.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Faculty</p>
            <p className="mt-1 text-sm font-medium text-navy-900">{user.facultyName}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

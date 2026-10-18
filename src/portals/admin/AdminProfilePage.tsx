import { useNavigate } from 'react-router-dom'
import { Mail, ShieldCheck, LogOut } from 'lucide-react'
import { useLogout, useMe } from '@/auth/authApi'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { initials } from '@/lib/format'

export function AdminProfilePage() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = me?.role === 'admin' ? me : undefined

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-navy-900 px-6 py-5 text-white">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold" aria-hidden>
            {initials(user.fullName)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{user.fullName}</h2>
            <p className="text-sm text-white/70">Administrator</p>
          </div>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-muted" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-success" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p>
              <p className="mt-1 text-sm font-medium text-success">{user.status === 'ACTIVE' ? 'Active and verified' : user.status.replaceAll('_', ' ')}</p>
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <Button
              variant="danger"
              className="w-full justify-center"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/oversight', { replace: true }) })}
              loading={logout.isPending}
            >
              <LogOut className="size-4" aria-hidden /> Sign Out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

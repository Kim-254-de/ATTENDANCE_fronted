import { useNavigate } from 'react-router-dom'
import { BadgeCheck, LogOut, Mail } from 'lucide-react'
import { ChangePasswordRow } from '@/auth/ChangePasswordRow'
import { useLogout, useMe } from '@/auth/authApi'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { initials } from '@/lib/format'
import type { Account } from '@/types'

type OfficerRole = 'admin' | 'department' | 'faculty' | 'qa'
type Officer = Extract<Account, { role: OfficerRole }>

/** "Department officer · Computer Science": what this account is, and over what. */
export function officerSubtitle(user: Officer): string {
  switch (user.role) {
    case 'admin': return 'Administrator'
    case 'department': return `Department officer · ${user.departmentName}`
    case 'faculty': return `Faculty officer · ${user.facultyName}`
    case 'qa': return user.title ? `Quality assurance · ${user.title}` : 'Quality assurance officer'
  }
}

/**
 * "My profile" for every invited officer (admin, faculty, department, QA). These accounts are
 * provisioned, so there is nothing to edit and no Delete account. Same order as the lecturer and
 * student pages: identity, details, the password, then Sign out.
 */
export function OfficerProfilePage({ role }: { role: OfficerRole }) {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = me?.role === role ? (me as Officer) : undefined

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-brand-800 px-6 py-5 text-white">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold" aria-hidden>
            {initials(user.fullName)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{user.fullName}</h2>
            <p className="text-sm text-white/70">{officerSubtitle(user)}</p>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-muted" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p>
            </div>
          </div>
          {/* Only when it needs attention: anyone reading this page while ACTIVE knows they're active. */}
          {user.status !== 'ACTIVE' && (
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 size-5 text-warning" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p>
                <p className="mt-1 text-sm font-medium text-warning">{user.status.replaceAll('_', ' ').toLowerCase()}</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-line px-6 py-3">
          <ChangePasswordRow />
        </div>
      </Card>
      <Button
        variant="danger"
        className="w-full justify-center"
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/oversight', { replace: true }) })}
        loading={logout.isPending}
      >
        <LogOut className="size-4" aria-hidden /> Sign Out
      </Button>
    </div>
  )
}

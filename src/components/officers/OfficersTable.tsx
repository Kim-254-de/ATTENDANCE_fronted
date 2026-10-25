import { MailPlus, UserX } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { formatDateTime, initials } from '@/lib/format'
import type { Officer } from '@/types'
import { useOfficerActions } from './useOfficerActions'

const ROLE_LABEL: Record<Officer['role'], string> = { admin: 'Administrator', management: 'Management', department: 'Department officer', qa: 'QA officer', timetabling: 'Timetabling office' }

function StatusBadge({ officer }: { officer: Officer }) {
  if (officer.status === 'ACTIVE') return <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">Active</span>
  if (officer.status === 'DEACTIVATED') return <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">Deactivated</span>
  const expired = !officer.invitationExpiresAt || new Date(officer.invitationExpiresAt) <= new Date()
  return (
    <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning" title={officer.invitationExpiresAt ? `Link expires ${formatDateTime(officer.invitationExpiresAt)}` : undefined}>
      {expired ? 'Invitation expired' : 'Invited'}
    </span>
  )
}

/**
 * Administrators and officers with their invitation status, and the two
 * things whoever manages them can do: re-send a pending invitation (a new
 * link; the old one stops working) and remove someone's access.
 */
export function OfficersTable({
  officers,
  base,
  listKey,
  currentUserId,
  emptyText,
}: {
  officers: Officer[]
  base: '/admin/officers'
  listKey: readonly unknown[]
  currentUserId?: string
  emptyText: string
}) {
  const { resend, deactivate } = useOfficerActions(base, listKey)

  const onResend = (officer: Officer) =>
    resend.mutate(officer.userId, {
      onSuccess: (result) =>
        window.alert(result.emailSent ? `A new invitation was sent to ${officer.email}.` : 'A new link was created, but the email could not be sent. Try again shortly.'),
      onError: (error) => window.alert(errorMessage(error, 'Could not re-send the invitation.')),
    })

  const onDeactivate = (officer: Officer) => {
    if (!window.confirm(`Remove ${officer.fullName}'s access? They are signed out at once and their invitation link stops working. Invite them again to restore it.`)) return
    deactivate.mutate(officer.userId, { onError: (error) => window.alert(errorMessage(error, 'Could not remove access.')) })
  }

  if (officers.length === 0) return <Card className="p-10 text-center text-sm text-muted">{emptyText}</Card>

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
            <th scope="col" className="px-5 py-3">Name</th>
            <th scope="col" className="px-5 py-3">Role</th>
            <th scope="col" className="px-5 py-3">Status</th>
            <th scope="col" className="px-5 py-3">Last sign-in</th>
            <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {officers.map((o) => (
            <tr key={o.userId}>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{initials(o.fullName)}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{o.fullName}</p>
                    <p className="truncate text-xs text-muted">{o.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <p className="text-ink">{ROLE_LABEL[o.role]}</p>
                <p className="text-xs text-muted">{o.departmentName ?? (o.role === 'management' ? 'Whole university' : o.role === 'timetabling' ? 'Signs in at the Timetable Generator' : '—')}</p>
              </td>
              <td className="px-5 py-3"><StatusBadge officer={o} /></td>
              <td className="px-5 py-3 text-muted">{o.lastLoginAt ? formatDateTime(o.lastLoginAt) : 'Never'}</td>
              <td className="px-5 py-3">
                <div className="flex justify-end gap-1">
                  {o.status === 'PENDING_VERIFICATION' && (
                    <button type="button" onClick={() => onResend(o)} disabled={resend.isPending} aria-label={`Re-send ${o.fullName}'s invitation`} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-60">
                      <MailPlus className="size-4" aria-hidden /> Re-send
                    </button>
                  )}
                  {o.status !== 'DEACTIVATED' && o.userId !== currentUserId && (
                    <button type="button" onClick={() => onDeactivate(o)} disabled={deactivate.isPending} aria-label={`Remove ${o.fullName}'s access`} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60">
                      <UserX className="size-4" aria-hidden /> Remove access
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

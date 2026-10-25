import { useState } from 'react'
import { useMe } from '@/auth/authApi'
import { InviteForm } from '@/components/officers/InviteForm'
import { OfficersTable } from '@/components/officers/OfficersTable'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import { ADMIN_OFFICERS_KEY, useAdminDepartments, useAdminInvite, useAdminOfficers } from './adminApi'

/**
 * Who has access to the oversight portals. Administrators invite management
 * (university-wide), each department's officer and
 * QA officers here, and remove their access when they leave. With SMARTTT
 * accounts on, administrators are SMARTTT administrators and are not invited here.
 */
export function OfficersPage() {
  const { data: me } = useMe()
  const officers = useAdminOfficers()
  const departments = useAdminDepartments()
  const invite = useAdminInvite()
  const [role, setRole] = useState<'management' | 'department' | 'qa' | 'admin'>('management')
  const [departmentId, setDepartmentId] = useState('')
  const [notice, setNotice] = useState<{ text: string; warn: boolean } | null>(null)
  const adminsInSmarttt = smartttAccounts()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <InviteForm
        title="Invite someone"
        description="They get an email with a link to choose their own password, valid for 72 hours. Use their own work email, not a shared mailbox."
        pending={invite.isPending}
        error={invite.error}
        canSubmit={role !== 'department' || !!departmentId}
        onInvite={(invitee, done) =>
          invite.mutate(role === 'department' ? { role, departmentId, ...invitee } : { role, ...invitee }, {
            onSuccess: (result) => {
              done()
              setNotice(result.emailSent
                ? { text: `Invitation sent to ${invitee.email}.`, warn: false }
                : { text: `${invitee.fullName}'s account was created, but the email could not be sent. Use Re-send below.`, warn: true })
            },
          })}
      >
        <label className="block space-y-1.5 text-sm font-semibold text-ink">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as 'management' | 'department' | 'qa' | 'admin')} className="input">
            <option value="management">Management</option>
            <option value="department">Department officer</option>
            <option value="qa">QA officer</option>
            {!adminsInSmarttt && <option value="admin">Administrator</option>}
          </select>
        </label>
        {role === 'department' && (
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Department
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input">
              <option value="">Choose a department…</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.departmentId} value={d.departmentId}>{d.code ? `${d.name} (${d.code})` : d.name}</option>
              ))}
            </select>
          </label>
        )}
      </InviteForm>
      {adminsInSmarttt && (
        <p className="rounded-lg bg-card px-4 py-3 text-sm text-muted shadow-[0_1px_3px_rgba(18,48,95,0.08)]">
          <strong className="text-ink">Administrators</strong> are SMARTTT administrators: give the person staff status in SMARTTT
          (a non-teaching account) and they sign in here with their SMARTTT login. There is no separate invitation.
        </p>
      )}
      {notice && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.warn ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>{notice.text}</p>}

      {officers.error ? (
        <Card className="p-5 text-sm text-danger" role="alert">{errorMessage(officers.error, 'Could not load officers.')}</Card>
      ) : officers.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <OfficersTable officers={officers.data} base="/admin/officers" listKey={ADMIN_OFFICERS_KEY} currentUserId={me?.id} emptyText="Nobody has been invited yet." />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useMe } from '@/auth/authApi'
import { InviteForm } from '@/components/officers/InviteForm'
import { OfficersTable } from '@/components/officers/OfficersTable'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import { ADMIN_OFFICERS_KEY, useAdminFaculties, useAdminInvite, useAdminOfficers } from './adminApi'

/**
 * Who has access to the oversight portals. Administrators invite faculty
 * officers here; department officers are invited by their own faculty officer,
 * but appear here too so access can be removed. With SMARTTT accounts on,
 * administrators are SMARTTT administrators and are not invited here.
 */
export function OfficersPage() {
  const { data: me } = useMe()
  const officers = useAdminOfficers()
  const faculties = useAdminFaculties()
  const invite = useAdminInvite()
  const [role, setRole] = useState<'faculty' | 'admin'>('faculty')
  const [facultyId, setFacultyId] = useState('')
  const [notice, setNotice] = useState<{ text: string; warn: boolean } | null>(null)
  const adminsInSmarttt = smartttAccounts()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <InviteForm
        title="Invite someone"
        description="They get an email with a link to choose their own password, valid for 72 hours. Use their own work email, not a shared mailbox."
        pending={invite.isPending}
        error={invite.error}
        canSubmit={role === 'admin' || !!facultyId}
        onInvite={(invitee, done) =>
          invite.mutate(role === 'admin' ? { role, ...invitee } : { role, facultyId, ...invitee }, {
            onSuccess: (result) => {
              done()
              setNotice(result.emailSent
                ? { text: `Invitation sent to ${invitee.email}.`, warn: false }
                : { text: `${invitee.fullName}'s account was created, but the email could not be sent. Use Re-send below.`, warn: true })
            },
          })}
      >
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as 'faculty' | 'admin')} className="input">
            <option value="faculty">Faculty officer</option>
            {!adminsInSmarttt && <option value="admin">Administrator</option>}
          </select>
        </label>
        {role === 'faculty' && (
          <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
            Faculty
            <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className="input">
              <option value="">Choose a faculty…</option>
              {(faculties.data ?? []).map((f) => <option key={f.facultyId} value={f.facultyId}>{f.name}</option>)}
            </select>
          </label>
        )}
      </InviteForm>
      {adminsInSmarttt && (
        <p className="rounded-lg bg-white px-4 py-3 text-sm text-muted shadow-[0_1px_3px_rgba(18,48,95,0.08)]">
          <strong className="text-navy-900">Administrators</strong> are SMARTTT administrators: give the person staff status in SMARTTT
          (a non-teaching account) and they sign in here with their SMARTTT login. There is no separate invitation.
        </p>
      )}
      {notice && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.warn ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-success'}`}>{notice.text}</p>}

      {officers.error ? (
        <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(officers.error, 'Could not load officers.')}</Card>
      ) : officers.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <OfficersTable officers={officers.data} base="/admin/officers" listKey={ADMIN_OFFICERS_KEY} currentUserId={me?.id} emptyText="Nobody has been invited yet." />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useMe } from '@/auth/authApi'
import { InviteForm } from '@/components/officers/InviteForm'
import { OfficersTable } from '@/components/officers/OfficersTable'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { ADMIN_OFFICERS_KEY, useAdminFaculties, useAdminInvite, useAdminOfficers } from './adminApi'

/**
 * Who has access to the oversight portals. Administrators invite faculty
 * officers, QA officers and other administrators here; department officers are invited by
 * their own faculty officer, but appear here too so access can be removed.
 */
export function OfficersPage() {
  const { data: me } = useMe()
  const officers = useAdminOfficers()
  const faculties = useAdminFaculties()
  const invite = useAdminInvite()
  const [role, setRole] = useState<'faculty' | 'qa' | 'admin'>('faculty')
  const [facultyId, setFacultyId] = useState('')
  const [notice, setNotice] = useState<{ text: string; warn: boolean } | null>(null)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <InviteForm
        title="Invite someone"
        description="They get an email with a link to choose their own password, valid for 72 hours. Use their own work email, not a shared mailbox."
        pending={invite.isPending}
        error={invite.error}
        canSubmit={role !== 'faculty' || !!facultyId}
        onInvite={(invitee, done) =>
          invite.mutate(role === 'faculty' ? { role, facultyId, ...invitee } : { role, ...invitee }, {
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
          <select value={role} onChange={(e) => setRole(e.target.value as 'faculty' | 'qa' | 'admin')} className="input">
            <option value="faculty">Faculty officer</option>
            <option value="qa">QA officer</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        {role === 'faculty' && (
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Faculty
            <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className="input">
              <option value="">Choose a faculty…</option>
              {(faculties.data ?? []).map((f) => <option key={f.facultyId} value={f.facultyId}>{f.name}</option>)}
            </select>
          </label>
        )}
      </InviteForm>
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

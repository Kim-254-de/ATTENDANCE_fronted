import { useState } from 'react'
import { InviteForm } from '@/components/officers/InviteForm'
import { OfficersTable } from '@/components/officers/OfficersTable'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useFacultyDepartments } from '../departments/departmentsApi'
import { FACULTY_OFFICERS_KEY, useDepartmentOfficers, useInviteDepartmentOfficer } from './officersApi'

/**
 * Department officers: the faculty invites the officer for each of its own
 * departments, and removes their access when they leave the post.
 */
export function OfficersPage() {
  const officers = useDepartmentOfficers()
  const departments = useFacultyDepartments()
  const invite = useInviteDepartmentOfficer()
  const [departmentId, setDepartmentId] = useState('')
  const [notice, setNotice] = useState<{ text: string; warn: boolean } | null>(null)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <InviteForm
        title="Invite a department officer"
        description="They get an email with a link to choose their own password, valid for 72 hours. Use their own work email, not a shared departmental mailbox."
        pending={invite.isPending}
        error={invite.error}
        canSubmit={!!departmentId}
        brightGold
        onInvite={(invitee, done) =>
          invite.mutate({ departmentId, ...invitee }, {
            onSuccess: (result) => {
              done()
              setNotice(result.emailSent
                ? { text: `Invitation sent to ${invitee.email}.`, warn: false }
                : { text: `${invitee.fullName}'s account was created, but the email could not be sent. Use Re-send below.`, warn: true })
            },
          })}
      >
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
          Department
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input">
            <option value="">Choose a department…</option>
            {(departments.data ?? []).map((d) => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
          </select>
        </label>
      </InviteForm>
      {notice && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.warn ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-success'}`}>{notice.text}</p>}

      {officers.error ? (
        <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(officers.error, 'Could not load department officers.')}</Card>
      ) : officers.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <OfficersTable officers={officers.data} base="/faculties/officers" listKey={FACULTY_OFFICERS_KEY} emptyText="No department officers yet. Invite one above." />
      )}
    </div>
  )
}

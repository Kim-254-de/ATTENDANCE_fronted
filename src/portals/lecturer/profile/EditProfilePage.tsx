import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMe, useUpdateProfile, type UpdateProfileInput } from '@/auth/authApi'
import type { Lecturer } from '@/types'
import { Field } from '@/auth/ChangePasswordCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'

export function EditProfilePage() {
  const { data: me } = useMe()
  const user = me?.role === 'lecturer' ? me : undefined
  if (!user) return null
  // Keyed on the user, so the form starts from their saved details instead of filling in a render late.
  return <EditProfileForm key={user.id} user={user} />
}

function EditProfileForm({ user }: { user: Lecturer }) {
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState<UpdateProfileInput>({ title: user.title, department: user.department })
  const [saved, setSaved] = useState(false)

  const setField = (field: keyof UpdateProfileInput, value: string) => {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(false)
    updateProfile.mutate(form, { onSuccess: () => setSaved(true) })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to profile
      </Link>
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-3 border-b border-line pb-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><UserRound className="size-5" aria-hidden /></span>
          <div><h2 className="font-bold text-navy-900">Edit profile</h2><p className="mt-1 text-sm text-muted">Update your professional title and department.</p></div>
        </div>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={user.fullName} readOnly />
            <Field label="School email" type="email" value={user.email} readOnly />
            <Field label="Title" value={form.title} onChange={(value) => setField('title', value)} placeholder="e.g. Dr." />
            <Field label="Department" value={form.department} onChange={(value) => setField('department', value)} required />
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="text-sm">
              {saved && <span className="inline-flex items-center gap-2 font-medium text-success"><Check className="size-4" aria-hidden />Profile updated</span>}
              {updateProfile.isError && <span className="text-red-600">{errorMessage(updateProfile.error)}</span>}
            </div>
            <Button type="submit" variant="lecturer" loading={updateProfile.isPending}>Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
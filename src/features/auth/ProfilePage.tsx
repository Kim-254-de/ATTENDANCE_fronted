import { useEffect, useState, type FormEvent } from 'react'
import { Check, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { useMe, useUpdateProfile, type UpdateProfileInput } from './authApi'

const emptyForm: UpdateProfileInput = { fullName: '', title: '', department: '', email: '' }

export function ProfilePage() {
  const { data: user } = useMe()
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState<UpdateProfileInput>(() => (user ? { fullName: user.fullName, title: user.title, department: user.department, email: user.email } : emptyForm))
  const [saved, setSaved] = useState(false)

  // Fill the form once per account: a background refetch of /auth/me must not wipe unsaved edits.
  useEffect(() => {
    if (user) setForm({ fullName: user.fullName, title: user.title, department: user.department, email: user.email })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-gold-600">ACCOUNT SETTINGS</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Your profile</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Keep your lecturer details current so attendance records and ERP reports identify you correctly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="h-fit overflow-hidden">
          <div className="bg-navy-900 px-6 pb-7 pt-6 text-white">
            <div className="grid size-20 place-items-center rounded-2xl bg-gold-500 text-2xl font-bold shadow-lg shadow-black/15">{initials(user.fullName)}</div>
            <p className="mt-5 text-xl font-bold">{user.fullName}</p>
            <p className="mt-1 text-sm text-blue-200">{user.title || 'Lecturer'} · {user.department}</p>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 text-muted" aria-hidden />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p><p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-success" aria-hidden />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p><p className="mt-1 text-sm font-medium text-success">Active and verified</p></div>
            </div>
            <div className="border-t border-line pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Staff number</p><p className="mt-1 font-mono text-sm font-semibold text-navy-900">{user.staffNumber}</p></div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-start gap-3 border-b border-line pb-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><UserRound className="size-5" aria-hidden /></span>
            <div><h3 className="font-bold text-navy-900">Personal details</h3><p className="mt-1 text-sm text-muted">These details appear across your lecturer portal.</p></div>
          </div>
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" value={form.fullName} onChange={(value) => setField('fullName', value)} required />
              <Field label="Title" value={form.title} onChange={(value) => setField('title', value)} placeholder="e.g. Dr." />
              <Field label="School email" type="email" value={form.email} onChange={(value) => setField('email', value)} required />
              <Field label="Department" value={form.department} onChange={(value) => setField('department', value)} required />
            </div>
            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div aria-live="polite" className="text-sm">
                {saved && <span className="inline-flex items-center gap-2 font-medium text-success"><Check className="size-4" aria-hidden />Profile updated</span>}
                {updateProfile.isError && <span className="text-red-600">{errorMessage(updateProfile.error)}</span>}
              </div>
              <Button type="submit" loading={updateProfile.isPending}>Save changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-navy-900">
      {label}
      <input className="input mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  )
}
import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, GraduationCap, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api, errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import type { Lecturer } from '@/types'
import { ME_KEY, useMe } from './authApi'

/**
 * Separate from the lecturer's UpdateProfileInput on purpose: the student
 * module has no real backend yet (only mocks), so this shape is whatever the
 * mock expects rather than a contract the real API has committed to.
 */
interface StudentProfileInput {
  fullName: string
  email: string
  department: string
}

function useUpdateStudentProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: StudentProfileInput) => (await api.patch<Lecturer>('/auth/me', input)).data,
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  })
}

export function StudentProfilePage() {
  const { data: user } = useMe()
  const updateProfile = useUpdateStudentProfile()
  const [form, setForm] = useState<StudentProfileInput>(() => (user ? { fullName: user.fullName, department: user.department, email: user.email } : { fullName: '', department: '', email: '' }))
  const [saved, setSaved] = useState(false)

  // Fill the form once per account: a background refetch of /auth/me must not wipe unsaved edits.
  useEffect(() => {
    if (user) setForm({ fullName: user.fullName, department: user.department, email: user.email })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null
  const setField = (field: keyof StudentProfileInput, value: string) => {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateProfile.mutate(form, { onSuccess: () => setSaved(true) })
  }

  return (
    <main className="min-h-dvh bg-surface p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center gap-3 rounded-2xl bg-navy-900 px-5 py-4 text-white shadow-lg sm:px-7">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500"><GraduationCap className="size-6" aria-hidden /></span>
          <div><p className="font-bold">UniLearn ERP</p><p className="text-sm text-blue-200">Student Portal</p></div>
          <span className="ml-auto text-sm text-blue-200">{user.staffNumber}</span>
        </header>
        <div>
          <p className="text-sm font-semibold text-gold-600">ACCOUNT SETTINGS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Student profile</h1>
          <p className="mt-2 text-sm text-muted">Manage the details used to identify you in attendance records.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="h-fit overflow-hidden">
            <div className="bg-navy-900 px-6 pb-7 pt-6 text-white">
              <div className="grid size-20 place-items-center rounded-2xl bg-gold-500 text-2xl font-bold">{initials(user.fullName)}</div>
              <p className="mt-5 text-xl font-bold">{user.fullName}</p>
              <p className="mt-1 text-sm text-blue-200">{user.department}</p>
            </div>
            <div className="space-y-4 p-6">
              <Info icon={<Mail className="size-5" />} label="Email" value={user.email} />
              <Info icon={<ShieldCheck className="size-5 text-success" />} label="Account status" value="Active and verified" valueClass="text-success" />
              <div className="border-t border-line pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Student number</p><p className="mt-1 font-mono text-sm font-semibold text-navy-900">{user.staffNumber}</p></div>
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <h2 className="font-bold text-navy-900">Personal details</h2>
            <p className="mt-1 text-sm text-muted">Keep your student contact details current.</p>
            <form className="mt-6 space-y-5" onSubmit={submit}>
              <Field label="Full name" value={form.fullName} onChange={(value) => setField('fullName', value)} />
              <Field label="Student email" type="email" value={form.email} onChange={(value) => setField('email', value)} />
              <Field label="Programme" value={form.department} onChange={(value) => setField('department', value)} />
              <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div aria-live="polite" className="text-sm">{saved && <span className="inline-flex items-center gap-2 font-medium text-success"><Check className="size-4" aria-hidden />Profile updated</span>}{updateProfile.isError && <span className="text-red-600">{errorMessage(updateProfile.error)}</span>}</div>
                <Button type="submit" loading={updateProfile.isPending}>Save changes</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  )
}

function Info({ icon, label, value, valueClass = 'text-ink' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return <div className="flex items-start gap-3">{icon}<div><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className={`mt-1 break-all text-sm font-medium ${valueClass}`}>{value}</p></div></div>
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-semibold text-navy-900">{label}<input className="input mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>
}
import { useId, useState, type FormEvent } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { useChangePassword, type ChangePasswordInput } from './authApi'

/** Shared between the lecturer and student profile pages. */
export function ChangePasswordCard() {
  const changePassword = useChangePassword()
  const [form, setForm] = useState<ChangePasswordInput>({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [done, setDone] = useState<string | null>(null)

  const setField = (field: keyof ChangePasswordInput, value: string) => {
    setDone(null)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDone(null)
    changePassword.mutate(form, {
      onSuccess: (result) => {
        setDone(result.message)
        setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      },
    })
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-3 border-b border-line pb-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><ShieldCheck className="size-5" aria-hidden /></span>
        <div><h3 className="font-bold text-navy-900">Change password</h3><p className="mt-1 text-sm text-muted">Signs you out on every other device you're currently signed in on.</p></div>
      </div>
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Current password" type="password" value={form.currentPassword} onChange={(v) => setField('currentPassword', v)} required />
          <div />
          <Field label="New password" type="password" value={form.newPassword} onChange={(v) => setField('newPassword', v)} required />
          <Field label="Confirm new password" type="password" value={form.confirmNewPassword} onChange={(v) => setField('confirmNewPassword', v)} required />
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {done && <span className="inline-flex items-center gap-2 font-medium text-success"><Check className="size-4" aria-hidden />{done}</span>}
            {changePassword.isError && <span className="text-red-600">{errorMessage(changePassword.error)}</span>}
          </div>
          <Button type="submit" loading={changePassword.isPending}>Update password</Button>
        </div>
      </form>
    </Card>
  )
}

/** Small label+input used by the profile pages. */
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  readOnly,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">{label}</label>
      <input
        id={id}
        className={`input mt-2 ${readOnly ? 'cursor-not-allowed bg-navy-900/5 text-muted' : ''}`}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
      />
    </div>
  )
}

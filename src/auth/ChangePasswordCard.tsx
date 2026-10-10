import { useId } from 'react'
import { Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import { useForgotPassword, useMe } from './authApi'

/**
 * Shared between the lecturer and student profile pages. Rather than an inline current/new/
 * confirm form, this sends the same reset-link email the "Forgot password?" link on sign-in
 * does — one button, no fields, and nothing on screen to congest the profile page with.
 */
export function ChangePasswordCard() {
  const { data: me } = useMe()
  const forgotPassword = useForgotPassword()

  if (!me) return null
  // The student portal uses blue as its accent, the lecturer portal green.
  const variant = me.role === 'student' ? 'accent' : 'lecturer'
  // Their password is their SMARTTT one: a reset link from here would change nothing.
  const viaSmarttt = smartttAccounts() && (me.role === 'student' || me.role === 'lecturer')

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${me.role === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-navy-900/5 text-navy-900'}`}><ShieldCheck className="size-5" aria-hidden /></span>
        <div><h3 className="font-bold text-navy-900">Change password</h3>{!viaSmarttt && <p className="mt-1 text-sm text-muted">We'll email a secure reset link to {me.email}. Signs you out on every other device once used.</p>}</div>
      </div>
      {viaSmarttt ? (
        <p className="mt-5 text-sm text-muted">You sign in with your <strong className="text-navy-900">SMARTTT</strong> password. Change or reset it in SMARTTT, then use the new one here.</p>
      ) : forgotPassword.isSuccess ? (
        <p role="status" className="mt-5 flex items-center gap-2 text-sm font-medium text-success"><Mail className="size-4" aria-hidden /> Check your inbox for the reset link.</p>
      ) : (
        <>
          <Button variant={variant} className="mt-5" loading={forgotPassword.isPending} onClick={() => forgotPassword.mutate(me.email)}>Send reset link</Button>
          {forgotPassword.isError && <p className="mt-2 text-sm text-red-600">{errorMessage(forgotPassword.error)}</p>}
        </>
      )}
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

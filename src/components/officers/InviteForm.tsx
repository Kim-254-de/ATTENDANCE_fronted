import { useState, type FormEvent, type ReactNode } from 'react'
import { MailPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage, fieldErrors } from '@/lib/api'

/**
 * Name + email, plus whatever scope the page adds (`children`: a faculty or
 * department picker). The invitee gets an email to choose their own password;
 * nothing here ever sets one.
 */
export function InviteForm({
  title,
  description,
  pending,
  error,
  onInvite,
  children,
  canSubmit = true,
  brightGold = false,
}: {
  title: string
  description: string
  pending: boolean
  error: unknown
  onInvite: (invitee: { fullName: string; email: string }, done: () => void) => void
  children?: ReactNode
  canSubmit?: boolean
  brightGold?: boolean
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const errors = error ? fieldErrors(error) : {}

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    onInvite({ fullName: fullName.trim(), email: email.trim() }, () => { setFullName(''); setEmail('') })
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold text-navy-900">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" autoComplete="off" required />
          {errors['fullName'] && <span role="alert" className="block text-xs font-normal text-red-600">{errors['fullName']}</span>}
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
          Work email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input" autoComplete="off" required />
          {errors['email'] && <span role="alert" className="block text-xs font-normal text-red-600">{errors['email']}</span>}
        </label>
        {children}
        {error && Object.keys(errors).length === 0 ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{errorMessage(error, 'Could not send the invitation.')}</p>
        ) : null}
        <div className="md:col-span-2">
          <Button type="submit" variant={brightGold ? 'brightGold' : 'primary'} loading={pending} disabled={!fullName.trim() || !email.trim() || !canSubmit}>
            <MailPlus className="size-4" aria-hidden /> Send invitation
          </Button>
        </div>
      </form>
    </Card>
  )
}

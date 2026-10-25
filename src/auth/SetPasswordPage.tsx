import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, KeyRound, TriangleAlert } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage, fieldErrors } from '@/lib/api'
import { Field } from './AuthCard'
import { NEW_PASSWORD_HINT, newPasswordRule } from './passwordRules'
import { AuthShell } from './AuthShell'
import { useAcceptInvitation, useInvitationDetails, useResetPassword } from './authApi'

const schema = z
  .object({
    password: newPasswordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })
type Values = z.infer<typeof schema>

const ROLE_LABEL = { admin: 'an administrator', management: 'a member of management', department: 'department officer', qa: 'quality assurance officer' } as const

const CARD = 'space-y-5 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-8'

/**
 * Where an emailed link lands to choose a password:
 *  - `invite` (/accept-invite): an administrator or officer activating the
 *    account they were invited to, then sent to the staff sign-in page.
 *  - `reset` (/reset-password): anyone completing a password reset.
 */
export function SetPasswordPage({ mode }: { mode: 'invite' | 'reset' }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const invitation = useInvitationDetails(mode === 'invite' ? token : null)
  const accept = useAcceptInvitation()
  const reset = useResetPassword()
  const submit = mode === 'invite' ? accept : reset
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })

  const title = mode === 'invite' ? 'Activate your account' : 'Choose a new password'

  const brokenLink = (message: string) => (
    <AuthShell title={title}>
      <div className={CARD} role="alert">
        <div className="grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning"><TriangleAlert className="size-7" aria-hidden /></div>
        <p className="text-sm leading-6 text-muted">{message}</p>
        <Link to={mode === 'invite' ? '/oversight' : '/'} className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink hover:bg-surface">
          {mode === 'invite' ? 'Go to staff sign-in' : 'Back to sign in'}
        </Link>
      </div>
    </AuthShell>
  )

  if (!token) return brokenLink('This link is missing its code. Open the link from your email again.')
  if (mode === 'invite' && invitation.isError) return brokenLink(errorMessage(invitation.error))
  if (mode === 'invite' && invitation.isPending) {
    return <AuthShell title={title}><p role="status" className="text-sm text-muted">Checking your invitation…</p></AuthShell>
  }

  if (mode === 'reset' && reset.isSuccess) {
    return (
      <AuthShell title="Password changed">
        <div className={CARD} role="status">
          <div className="grid size-14 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-7" aria-hidden /></div>
          <p className="text-sm leading-6 text-muted">{reset.data.message}</p>
          <Link to="/" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink hover:bg-surface">Go to sign in</Link>
        </div>
      </AuthShell>
    )
  }

  const details = invitation.data
  const serverErrors = submit.isError ? fieldErrors(submit.error) : {}

  const onSubmit = handleSubmit((values) => {
    const input = { token, ...values }
    if (mode === 'invite') {
      accept.mutate(input, {
        onSuccess: () => navigate('/oversight', { replace: true, state: { message: 'Your account is ready. Sign in with your email and new password.' } }),
      })
    } else {
      reset.mutate(input)
    }
  })

  return (
    <AuthShell
      title={title}
      subtitle={details
        ? <>Welcome, <strong className="text-ink">{details.fullName}</strong>. You have been invited as {ROLE_LABEL[details.role]}{details.scopeName ? <> for <strong className="text-ink">{details.scopeName}</strong></> : null}.</>
        : undefined}
    >
      <form onSubmit={onSubmit} className={CARD} noValidate>
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-ink"><KeyRound className="size-7" aria-hidden /></div>
        {details && <p className="text-sm text-muted">You will sign in as <strong className="text-ink">{details.email}</strong>.</p>}
        {submit.isError && Object.keys(serverErrors).length === 0 && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errorMessage(submit.error)}</p>
        )}
        <Field label="New password" error={errors.password?.message ?? serverErrors['password']} hint={NEW_PASSWORD_HINT}>
          <input {...register('password')} type="password" autoComplete="new-password" className="input" />
        </Field>
        <Field label="Confirm new password" error={errors.confirmPassword?.message ?? serverErrors['confirmPassword']}>
          <input {...register('confirmPassword')} type="password" autoComplete="new-password" className="input" />
        </Field>
        <Button type="submit" loading={submit.isPending} className="w-full">
          {mode === 'invite' ? 'Activate account' : 'Change password'}
        </Button>
      </form>
    </AuthShell>
  )
}

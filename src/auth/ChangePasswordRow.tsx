import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ChevronRight, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage, fieldErrors } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import { Field } from './AuthCard'
import { useChangePassword, useMe } from './authApi'
import { NEW_PASSWORD_HINT, newPasswordRule } from './passwordRules'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: newPasswordRule,
    confirmNewPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, { path: ['confirmNewPassword'], message: 'Passwords do not match.' })
type Values = z.infer<typeof schema>

/**
 * Every profile page's password setting: a row that opens an in-app form (current, new,
 * confirm). With SMARTTT accounts a student's or lecturer's password is SMARTTT's and the
 * backend refuses the change, so the row says where to change it instead. Officers' stay here.
 */
export function ChangePasswordRow() {
  const { data: me } = useMe()
  const [open, setOpen] = useState(false)
  const change = useChangePassword()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })

  if (smartttAccounts() && (me?.role === 'student' || me?.role === 'lecturer')) {
    return (
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <div><p className="text-sm font-semibold text-ink">Password</p><p className="mt-1 text-sm text-muted">You sign in with your SMARTTT password. Change it in SMARTTT.</p></div>
      </div>
    )
  }

  const close = () => { setOpen(false); reset(); change.reset() }
  const serverErrors = change.isError ? fieldErrors(change.error) : {}

  if (change.isSuccess) {
    return <p role="status" className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="size-4 shrink-0" aria-hidden /> {change.data.message}</p>
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface">
        <KeyRound className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 text-sm font-semibold text-ink">Change password</span>
        <ChevronRight className="size-4 text-muted" aria-hidden />
      </button>
    )
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit((v) => change.mutate(v))} noValidate>
      <p className="flex items-center gap-3 text-sm font-semibold text-ink"><KeyRound className="size-5 text-muted" aria-hidden /> Change password</p>
      <Field label="Current password" error={errors.currentPassword?.message ?? serverErrors['currentPassword']}>
        <input {...register('currentPassword')} type="password" autoComplete="current-password" className="input" autoFocus />
      </Field>
      <Field label="New password" error={errors.newPassword?.message ?? serverErrors['newPassword']} hint={NEW_PASSWORD_HINT}>
        <input {...register('newPassword')} type="password" autoComplete="new-password" className="input" />
      </Field>
      <Field label="Confirm new password" error={errors.confirmNewPassword?.message ?? serverErrors['confirmNewPassword']}>
        <input {...register('confirmNewPassword')} type="password" autoComplete="new-password" className="input" />
      </Field>
      {change.isError && !Object.keys(serverErrors).length && <p role="alert" className="text-sm text-danger">{errorMessage(change.error)}</p>}
      <p className="text-xs text-muted">Your other devices will be signed out.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={change.isPending}>Save password</Button>
        <Button type="button" variant="secondary" onClick={close} disabled={change.isPending}>Cancel</Button>
      </div>
    </form>
  )
}

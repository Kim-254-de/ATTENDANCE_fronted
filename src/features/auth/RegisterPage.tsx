import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage, fieldErrors } from '@/lib/api'
import type { RegistrationInput } from '@/types'
import { AuthCard, Field } from './AuthCard'
import { useMe, useRegister } from './authApi'

// Mirrors the backend's rules so most mistakes are caught before a request (and an ERP lookup)
// is spent. The backend stays the authority: its per-field errors are shown the same way.
const schema = z
  .object({
    fullName: z.string().trim().min(3, 'Full name must be at least 3 characters.').max(160, 'Full name is too long.')
      .regex(/^[\p{L}][\p{L}\p{M}'\-.\s]*$/u, 'Full name may only contain letters, spaces, apostrophes and hyphens.'),
    email: z.string().trim().email('Enter a valid email address.').max(255, 'Email address is too long.'),
    staffNumber: z.string().trim().min(3, 'Staff number is too short.').max(64, 'Staff number is too long.')
      .regex(/^[A-Za-z0-9][A-Za-z0-9/\-_.]*$/, 'Staff number may only contain letters, digits and / - _ .'),
    password: z.string().min(12, 'Password must be at least 12 characters.').max(128, 'Password must be at most 128 characters.')
      .regex(/[a-z]/, 'Password must include a lowercase letter.')
      .regex(/[A-Z]/, 'Password must include an uppercase letter.')
      .regex(/[0-9]/, 'Password must include a digit.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' })
    const lowered = v.password.toLowerCase()
    const local = v.email.trim().split('@')[0] ?? ''
    if ((v.staffNumber.trim() && lowered.includes(v.staffNumber.trim().toLowerCase())) || (local.length >= 4 && lowered.includes(local.toLowerCase()))) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password must not contain your staff number or email address.' })
    }
  })

const FIELDS = ['fullName', 'email', 'staffNumber', 'password', 'confirmPassword'] as const

export function RegisterPage() {
  const { data: me } = useMe()
  const signUp = useRegister()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegistrationInput>({ resolver: zodResolver(schema) })

  if (me) return <Navigate to="/" replace />

  if (signUp.isSuccess) {
    return (
      <AuthCard title="Check your email" subtitle="One more step before you can sign in" wide>
        <div className="flex gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            {signUp.data.message} We sent a confirmation link to <strong>{signUp.data.email}</strong>. After you confirm it, an
            administrator will approve your account.
          </p>
        </div>
        <Link to="/login" className="block text-center text-sm font-semibold text-navy-900 hover:underline">Back to sign in</Link>
      </AuthCard>
    )
  }

  const onSubmit = handleSubmit((values) =>
    signUp.mutate(values, {
      onError: (err) => {
        for (const [field, message] of Object.entries(fieldErrors(err))) {
          if ((FIELDS as readonly string[]).includes(field)) setError(field as (typeof FIELDS)[number], { message })
        }
      },
    }),
  )

  return (
    <AuthCard title="Create lecturer account" subtitle="Your staff number is checked against the university's staff records" wide>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {signUp.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(signUp.error, 'Registration failed.')}</p>
        )}

        <Field label="Full name" error={errors.fullName?.message} hint="As it appears in your staff records">
          <input {...register('fullName')} autoComplete="name" className="input" />
        </Field>
        <Field label="Staff number" error={errors.staffNumber?.message}>
          <input {...register('staffNumber')} autoComplete="off" autoCapitalize="characters" className="input" />
        </Field>
        <Field label="Email" error={errors.email?.message} hint="Use your university email address">
          <input {...register('email')} type="email" autoComplete="email" className="input" />
        </Field>
        <Field label="Password" error={errors.password?.message} hint="At least 12 characters, with upper and lower case letters and a digit">
          <input {...register('password')} type="password" autoComplete="new-password" className="input" />
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <input {...register('confirmPassword')} type="password" autoComplete="new-password" className="input" />
        </Field>

        <Button type="submit" loading={signUp.isPending} className="w-full">Create account</Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already registered? <Link to="/login" className="font-semibold text-navy-900 underline-offset-2 hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  )
}

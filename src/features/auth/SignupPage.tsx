import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage, fieldErrors } from '@/lib/api'
import type { RegistrationInput } from '@/types'
import { Field } from './AuthCard'
import { AuthShell } from './AuthShell'
import { useMe, useRegister, useSignup } from './authApi'

// Mirrors the backend's rules so most mistakes are caught before a request (and an ERP lookup)
// is spent. The backend stays the authority: its per-field errors are shown the same way.
const schema = z
  .object({
    fullName: z.string().trim().min(3, 'Full name must be at least 3 characters.').max(160, 'Full name is too long.')
      .regex(/^[\p{L}][\p{L}\p{M}'\-.\s]*$/u, 'Full name may only contain letters, spaces, apostrophes and hyphens.'),
    email: z.string().trim().email('Enter a valid school email.').max(255, 'Email address is too long.'),
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

export function SignupPage() {
  const [searchParams] = useSearchParams()
  if (searchParams.get('role') === 'student') return <StudentSignup />
  return <LecturerSignup />
}

function LecturerSignup() {
  const { data: me } = useMe()
  const signup = useRegister()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegistrationInput>({ resolver: zodResolver(schema) })

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/'} replace />

  if (signup.isSuccess) {
    return (
      <AuthShell title="Check your email">
        <div className="space-y-5" role="status">
          <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-success"><MailCheck className="size-7" aria-hidden /></div>
          <p className="text-sm leading-6 text-muted">
            {signup.data.message} We sent a confirmation link to <strong className="text-navy-900">{signup.data.email}</strong>. After you
            confirm it, an administrator will approve your account.
          </p>
          <Link to="/login" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-navy-900 hover:bg-surface">Return to sign in</Link>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = handleSubmit((values) =>
    signup.mutate(values, {
      onError: (err) => {
        for (const [field, message] of Object.entries(fieldErrors(err))) {
          if ((FIELDS as readonly string[]).includes(field)) setError(field as (typeof FIELDS)[number], { message })
        }
      },
    }),
  )

  return (
    <AuthShell title="Create account" subtitle={<>Already registered? <Link to="/login" className="font-semibold text-navy-900 hover:underline">Sign in instead</Link></>}>
      <form className="space-y-5" noValidate onSubmit={onSubmit}>
        {signup.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(signup.error, 'We could not create your account.')}</p>}
        <Field label="School email" error={errors.email?.message}><input {...register('email')} type="email" autoComplete="email" placeholder="p.kamami@uni.ac.ke" className="input" /></Field>
        <Field label="Full name" error={errors.fullName?.message} hint="As it appears in your staff records"><input {...register('fullName')} autoComplete="name" placeholder="Dr. Peter Kamami" className="input" /></Field>
        <Field label="Staff number" error={errors.staffNumber?.message}><input {...register('staffNumber')} autoComplete="off" autoCapitalize="characters" placeholder="STF/0001" className="input" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message}><input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 12 characters" className="input" /></Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message}><input {...register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Repeat password" className="input" /></Field>
        </div>
        <p className="text-xs leading-5 text-muted">Use upper and lower case letters and a digit. Your staff number is checked against the university staff directory before the account is created.</p>
        <Button type="submit" loading={signup.isPending} className="h-12 w-full">Register account</Button>
      </form>
    </AuthShell>
  )
}

const studentSchema = z
  .object({
    email: z.string().trim().email('Enter a valid school email.'),
    fullName: z.string().trim().min(3, 'Enter your full name.'),
    staffNumber: z.string().trim().min(4, 'Enter your student number.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })
type StudentValues = z.infer<typeof studentSchema>

function StudentSignup() {
  const navigate = useNavigate()
  const signup = useSignup()
  const { data: me } = useMe()
  const { register, handleSubmit, formState: { errors } } = useForm<StudentValues>({ resolver: zodResolver(studentSchema) })

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/'} replace />

  return (
    <AuthShell title="Register as a student" subtitle={<>Already registered? <Link to="/login?role=student" className="font-semibold text-navy-900 hover:underline">Sign in instead</Link></>}>
      <form className="space-y-5" noValidate onSubmit={handleSubmit(({ confirmPassword: _, ...values }) => signup.mutate({ ...values, role: 'student' }, { onSuccess: () => navigate('/login?role=student', { state: { message: 'Account created. Sign in to continue.' } }) }))}>
        {signup.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(signup.error, 'We could not create your account.')}</p>}
        <Field label="School email" error={errors.email?.message}><input {...register('email')} type="email" autoComplete="email" placeholder="a.mensah@student.uni.ac.ke" className="input" /></Field>
        <Field label="Full name" error={errors.fullName?.message}><input {...register('fullName')} autoComplete="name" className="input" /></Field>
        <Field label="Student number" error={errors.staffNumber?.message}><input {...register('staffNumber')} autoComplete="off" placeholder="STU00042" className="input" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message}><input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 8 characters" className="input" /></Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message}><input {...register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Repeat password" className="input" /></Field>
        </div>
        <p className="text-xs leading-5 text-muted">Your student account will be verified against university records before access is granted.</p>
        <Button type="submit" loading={signup.isPending} className="h-12 w-full">Register as student</Button>
      </form>
    </AuthShell>
  )
}

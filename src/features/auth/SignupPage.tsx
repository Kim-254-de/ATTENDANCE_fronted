import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage, fieldErrors } from '@/lib/api'
import type { RegistrationInput, StudentRegistrationInput } from '@/types'
import { Field } from './AuthCard'
import { AuthShell } from './AuthShell'
import { useMe, useRegister, useStudentRegister } from './authApi'

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
    // Named "lecturer" on purpose: a bare /signup lands here, and a student who
    // did not notice would be typing their registration number into "Staff number".
    <AuthShell title="Create a lecturer account" subtitle={<>Already registered? <Link to="/login?role=lecturer" className="font-semibold text-navy-900 hover:underline">Sign in instead</Link></>}>
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
        <p className="text-center text-sm text-muted">
          Are you a student? <Link to="/signup?role=student" className="font-semibold text-navy-900 hover:underline">Register with your registration number</Link>
        </p>
      </form>
    </AuthShell>
  )
}

// Mirrors POST /auth/student/register's rules (backend auth.schema.ts studentRegistrationSchema).
const studentSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Full name must be at least 3 characters.').max(160, 'Full name is too long.')
      .regex(/^[\p{L}][\p{L}\p{M}'\-.\s]*$/u, 'Full name may only contain letters, spaces, apostrophes and hyphens.'),
    email: z.string().trim().email('Enter a valid email address.').max(255, 'Email address is too long.'),
    registrationNumber: z.string().trim().min(3, 'Registration number is too short.').max(64, 'Registration number is too long.')
      .regex(/^[A-Za-z0-9][A-Za-z0-9/\-_.]*$/, 'Registration number may only contain letters, digits and / - _ .'),
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
    const reg = v.registrationNumber.trim().toLowerCase()
    const compactReg = reg.replace(/[^a-z0-9]/g, '')
    if ((reg && lowered.includes(reg)) || (compactReg.length >= 6 && lowered.replace(/[^a-z0-9]/g, '').includes(compactReg)) || (local.length >= 4 && lowered.includes(local.toLowerCase()))) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password must not contain your registration number or email address.' })
    }
  })

const STUDENT_FIELDS = ['fullName', 'email', 'registrationNumber', 'password', 'confirmPassword'] as const

function StudentSignup() {
  const { data: me } = useMe()
  const signup = useStudentRegister()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<StudentRegistrationInput>({ resolver: zodResolver(studentSchema) })

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/'} replace />

  if (signup.isSuccess) {
    return (
      <AuthShell title="Check your email">
        <div className="space-y-5" role="status">
          <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-success"><MailCheck className="size-7" aria-hidden /></div>
          <p className="text-sm leading-6 text-muted">
            {signup.data.message} We sent a confirmation link to <strong className="text-navy-900">{signup.data.email}</strong>.
          </p>
          <Link to="/login?role=student" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-navy-900 hover:bg-surface">Go to student sign in</Link>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = handleSubmit((values) =>
    signup.mutate(values, {
      onError: (err) => {
        for (const [field, message] of Object.entries(fieldErrors(err))) {
          if ((STUDENT_FIELDS as readonly string[]).includes(field)) setError(field as (typeof STUDENT_FIELDS)[number], { message })
        }
      },
    }),
  )

  return (
    <AuthShell title="Register as a student" subtitle={<>Already registered? <Link to="/login?role=student" className="font-semibold text-navy-900 hover:underline">Sign in instead</Link></>}>
      <form className="space-y-5" noValidate onSubmit={onSubmit}>
        {signup.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(signup.error, 'We could not create your account.')}</p>}
        <Field label="Registration number" error={errors.registrationNumber?.message}><input {...register('registrationNumber')} autoComplete="off" autoCapitalize="characters" placeholder="EBT1/08223/23" className="input" /></Field>
        <Field label="Full name" error={errors.fullName?.message} hint="As it appears in your student records"><input {...register('fullName')} autoComplete="name" className="input" /></Field>
        <Field label="Email" error={errors.email?.message} hint="The email on your student record"><input {...register('email')} type="email" autoComplete="email" placeholder="you@students.tharaka.ac.ke" className="input" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message}><input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 12 characters" className="input" /></Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message}><input {...register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Repeat password" className="input" /></Field>
        </div>
        <p className="text-xs leading-5 text-muted">Use upper and lower case letters and a digit. Your registration number, name and email are checked against the student records before the account is created.</p>
        <Button type="submit" loading={signup.isPending} className="h-12 w-full">Register as student</Button>
      </form>
    </AuthShell>
  )
}

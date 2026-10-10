import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, IdCard, Lock, Mail, MailCheck, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage, fieldErrors } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import type { RegistrationInput, StudentRegistrationInput } from '@/types'
import { Field, IconField } from './AuthCard'
import { AuthShell } from './AuthShell'
import { useLogin, useMe, useRegister, useStudentRegister } from './authApi'
import { SocialSignIn, StudentAuthTabs } from './StudentAuthChrome'

// Mirrors the backend's rules so most mistakes are caught before a request (and an ERP lookup)
// is spent. The backend stays the authority: its per-field errors are shown the same way.
const schema = z
  .object({
    fullName: z.string().trim().min(3, 'Full name must be at least 3 characters.').max(160, 'Full name is too long.')
      .regex(/^[\p{L}][\p{L}\p{M}'\-.\s]*$/u, 'Full name may only contain letters, spaces, apostrophes and hyphens.'),
    email: z.string().trim().email('Enter a valid school email.').max(255, 'Email address is too long.'),
    staffNumber: z.string().trim().min(3, 'Staff number is too short.').max(64, 'Staff number is too long.')
      .regex(/^[A-Za-z0-9][A-Za-z0-9/\-_.]*$/, 'Staff number may only contain letters, digits and / - _ .'),
    password: z.string().min(6, 'Password must be at least 6 characters.').max(128, 'Password must be at most 128 characters.')
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
  const role = searchParams.get('role')
  // No sign-up here with SMARTTT accounts: the SMARTTT account is the account.
  if (smartttAccounts() && (role === 'student' || role === 'lecturer')) {
    return (
      <Navigate
        to={`/login?role=${role}`}
        replace
        state={{ message: 'There is no separate sign-up for attendance. Sign in with your SMARTTT account; if you have none, create it in SMARTTT first.' }}
      />
    )
  }
  if (role === 'student') return <StudentSignup />
  if (role === 'lecturer') return <LecturerSignup />
  return <Navigate to="/" replace />
}

function LecturerSignup() {
  const { data: me } = useMe()
  const signup = useRegister()
  const login = useLogin()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegistrationInput>({ resolver: zodResolver(schema) })

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/lecturer-dashboard'} replace />

  // A lecturer's staff number is verified against the staff directory before the account is
  // created, so there's no email to confirm — sign them in with the details they just chose.
  if (signup.isSuccess) {
    return (
      <AuthShell student title="Account created">
        <div className="space-y-5 text-center" role="status">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-success"><MailCheck className="size-7" aria-hidden /></div>
          <p className="text-sm leading-6 text-muted">{signup.data.message} Signing you in…</p>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = handleSubmit((values) =>
    signup.mutate(values, {
      onSuccess: () => {
        login.mutate({ identifier: values.email, password: values.password }, {
          onSuccess: () => navigate('/lecturer-dashboard', { replace: true }),
        })
      },
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
      <form className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-8" noValidate onSubmit={onSubmit}>
        {signup.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(signup.error, 'We could not create your account.')}</p>}
        <Field label="School email" error={errors.email?.message}><input {...register('email')} type="email" autoComplete="email" placeholder="p.kamami@uni.ac.ke" className="input" /></Field>
        <Field label="Full name" error={errors.fullName?.message}><input {...register('fullName')} autoComplete="name" placeholder="Dr. Peter Kamami" className="input" /></Field>
        <Field label="Staff number" error={errors.staffNumber?.message}><input {...register('staffNumber')} autoComplete="off" autoCapitalize="characters" placeholder="STF/0001" className="input" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 text-sm font-medium text-navy-900">
            <label htmlFor="lecturer-password" className="block">Password</label>
            <div className="relative">
              <input
                id="lecturer-password"
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="input pr-11"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'lecturer-password-error' : undefined}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-muted transition hover:text-navy-900"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {errors.password && <span id="lecturer-password-error" role="alert" className="block text-xs font-normal text-red-600">{errors.password.message}</span>}
          </div>

          <div className="space-y-1.5 text-sm font-medium text-navy-900">
            <label htmlFor="lecturer-confirm-password" className="block">Confirm password</label>
            <div className="relative">
              <input
                id="lecturer-confirm-password"
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat password"
                className="input pr-11"
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={errors.confirmPassword ? 'lecturer-confirm-password-error' : undefined}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-muted transition hover:text-navy-900"
              >
                {showConfirmPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {errors.confirmPassword && <span id="lecturer-confirm-password-error" role="alert" className="block text-xs font-normal text-red-600">{errors.confirmPassword.message}</span>}
          </div>
        </div>
        <p className="text-xs leading-5 text-muted">Use upper and lower case letters and a digit. Your staff number is checked against the university staff directory before the account is created.</p>
        <Button type="submit" variant="lecturer" loading={signup.isPending} className="w-full transition-transform hover:scale-[1.01] active:scale-[0.99]">Register account</Button>
        <p className="text-center text-sm text-muted">
          Are you a student? <Link to="/signup?role=student" className="font-semibold text-navy-900 hover:underline">Register with your registration number</Link>
        </p>
      </form>
      <p className="mt-6 text-center text-base text-muted">Already registered? <Link to="/login?role=lecturer" className="font-semibold text-navy-900 hover:underline">Sign in instead</Link></p>
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
    password: z.string().min(6, 'Password must be at least 6 characters.').max(128, 'Password must be at most 128 characters.')
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
  const login = useLogin()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, handleSubmit, setError, formState: { errors } } = useForm<StudentRegistrationInput>({ resolver: zodResolver(studentSchema) })

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/lecturer-dashboard'} replace />

  // No email to confirm: sign the student in with the details they just chose and take them straight in.
  if (signup.isSuccess) {
    return (
      <AuthShell title="Account created">
        <div className="space-y-5 text-center" role="status">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-success"><MailCheck className="size-7" aria-hidden /></div>
          <p className="text-sm leading-6 text-muted">{signup.data.message} Signing you in…</p>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = handleSubmit((values) =>
    signup.mutate(values, {
      onSuccess: () => {
        // Active at once, like lecturers: sign straight in with the details they just chose.
        login.mutate({ identifier: values.registrationNumber, password: values.password }, {
          onSuccess: () => navigate('/student-dashboard', { replace: true }),
        })
      },
      onError: (err) => {
        for (const [field, message] of Object.entries(fieldErrors(err))) {
          if ((STUDENT_FIELDS as readonly string[]).includes(field)) setError(field as (typeof STUDENT_FIELDS)[number], { message })
        }
      },
    }),
  )

  return (
    <AuthShell student title="STUDENT PORTAL" subtitle="Register to start tracking your attendance.">
      <StudentAuthTabs active="register" />
      <form className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-8" noValidate onSubmit={onSubmit}>
        {signup.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(signup.error, 'We could not create your account.')}</p>}
        <IconField id="student-full-name" label="Full Name" icon={User} {...register('fullName')} autoComplete="name" error={errors.fullName?.message} />
        <IconField id="student-registration-number" label="Student ID" icon={IdCard} {...register('registrationNumber')} autoComplete="off" autoCapitalize="characters" placeholder="EBT1/00000/23" error={errors.registrationNumber?.message} />
        <IconField id="student-email" label="Email" icon={Mail} {...register('email')} type="email" autoComplete="email" placeholder="you@students.tharaka.ac.ke" error={errors.email?.message} />
        <div className="grid gap-5 sm:grid-cols-2">
          <IconField
            id="student-password"
            label="Password"
            icon={Lock}
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-muted transition hover:text-navy-900"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            }
          />

          <IconField
            id="student-confirm-password"
            label="Confirm password"
            icon={Lock}
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat password"
            error={errors.confirmPassword?.message}
            trailing={
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-muted transition hover:text-navy-900"
              >
                {showConfirmPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            }
          />
        </div>
        <p className="text-xs leading-5 text-muted">Use upper and lower case letters and a digit. Your registration number, name and email are checked against the student records before the account is created.</p>
        <Button type="submit" variant="accent" loading={signup.isPending} className="w-full transition-transform hover:scale-[1.01] active:scale-[0.99]">Create Account</Button>
        <SocialSignIn />
      </form>
    </AuthShell>
  )
}

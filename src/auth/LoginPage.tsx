import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { Field, IconField } from './AuthCard'
import { AuthShell } from './AuthShell'
import { useLogin, useMe } from './authApi'
import { SocialSignIn, StudentAuthTabs } from './StudentAuthChrome'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your staff number, registration number or email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const role = roleParam === 'student' ? 'student' : roleParam === 'lecturer' ? 'lecturer' : null
  const from = (location.state as { from?: string } | null)?.from ?? '/lecturer-dashboard'
  const message = (location.state as { message?: string } | null)?.message
  const { data: me } = useMe()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  // Students only have the /student-* pages and /scan, so any other return path would bounce them anyway.
  // A student who opened /scan signed out goes straight back to the scanner after signing in.
  const landing = (r: string) => (r === 'student' && !from.startsWith('/student-') && from !== '/scan' ? '/student-dashboard' : from)

  if (me) return <Navigate to={landing(me.role)} replace />
  if (!role) return <Navigate to="/" replace />

  const isStudent = role === 'student'
  const toggleButton = (
    <button
      type="button"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      onClick={() => setShowPassword((value) => !value)}
      className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-muted transition hover:text-navy-900"
    >
      {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  )
  const passwordField = isStudent ? (
    <IconField
      id="login-password"
      label="Password"
      icon={Lock}
      {...register('password')}
      type={showPassword ? 'text' : 'password'}
      autoComplete="current-password"
      error={errors.password?.message}
      trailing={toggleButton}
    />
  ) : (
    <div className="space-y-1.5 text-sm font-medium text-navy-900">
      <label htmlFor="login-password" className="block">Password</label>
      <div className="relative">
        <input
          id="login-password"
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          className="input pr-11"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
        />
        {toggleButton}
      </div>
      {errors.password && <span id="login-password-error" role="alert" className="block text-xs font-normal text-red-600">{errors.password.message}</span>}
    </div>
  )

  return (
    <AuthShell student={isStudent} title={isStudent ? 'STUDENT PORTAL' : 'Lecturer Portal'} subtitle={isStudent ? 'Sign in to access your attendance dashboard.' : 'Sign in to manage attendance'}>
      {isStudent && <StudentAuthTabs active="signin" />}
      <form
        onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: (user) => navigate(landing(user.role), { replace: true }) }))}
        className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-8"
        noValidate
      >
        {login.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(login.error, 'Sign-in failed.')}</p>
        )}
        {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-success">{message}</p>}

        {isStudent ? (
          <IconField
            id="login-identifier"
            label="Registration number or email"
            icon={Mail}
            {...register('identifier')}
            autoComplete="username"
            error={errors.identifier?.message}
          />
        ) : (
          <Field label="Staff number or email" error={errors.identifier?.message}>
            <input {...register('identifier')} autoComplete="username" className="input" />
          </Field>
        )}
        {passwordField}

        <div className="flex justify-end"><Link to={isStudent ? '/forgot-password?role=student' : '/forgot-password'} className="text-sm font-semibold text-navy-800 hover:underline">Forgot password?</Link></div>

        <Button type="submit" variant={isStudent ? 'accent' : 'primary'} loading={login.isPending} className="w-full transition-transform hover:scale-[1.01] active:scale-[0.99]">{isStudent ? 'Sign In' : 'Sign in'}</Button>
        {isStudent && <SocialSignIn />}
      </form>
      {!isStudent && (
        <p className="mt-6 text-center text-base text-muted">
          New to UniLearn? <Link to="/signup?role=lecturer" className="font-semibold text-navy-900 hover:underline">Create an account</Link>
        </p>
      )}
    </AuthShell>
  )
}

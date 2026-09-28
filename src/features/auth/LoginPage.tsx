import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { AuthCard, Field } from './AuthCard'
import { useLogin, useMe } from './authApi'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your staff number, registration number or email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') === 'student' ? 'student' : 'lecturer'
  const from = (location.state as { from?: string } | null)?.from ?? '/'
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

  return (
    <AuthCard title={role === 'student' ? 'Student sign in' : 'Lecturer Portal'} subtitle={role === 'student' ? 'Sign in to your student portal' : 'Sign in to manage attendance'}>
      <form
        onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: (user) => navigate(landing(user.role), { replace: true }) }))}
        className="space-y-5"
        noValidate
      >
        {login.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(login.error, 'Sign-in failed.')}</p>
        )}
        {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-success">{message}</p>}

        <Field label={role === 'student' ? 'Registration number or email' : 'Staff number or email'} error={errors.identifier?.message}>
          <input {...register('identifier')} autoComplete="username" className="input" />
        </Field>
        <div className="space-y-1.5 text-sm font-medium text-navy-900">
          <label className="block space-y-1.5">
            <span className="block">Password</span>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-11"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-muted transition hover:text-navy-900"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </label>
          {errors.password && <span id="login-password-error" role="alert" className="block text-xs font-normal text-red-600">{errors.password.message}</span>}
        </div>

        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-navy-800 hover:underline">Forgot password?</Link></div>

        <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
        <p className="text-center text-sm text-muted">
          New to UniLearn? <Link to="/signup" className="font-semibold text-navy-900 hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthCard>
  )
}

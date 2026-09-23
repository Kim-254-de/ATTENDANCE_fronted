import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { AuthCard, Field } from './AuthCard'
import { useLogin, useMe } from './authApi'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your staff number or email'),
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  // Students only have the /student-* pages, so any other return path would bounce them anyway.
  const landing = (r: string) => (r === 'student' && !from.startsWith('/student-') ? '/student-dashboard' : from)

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

        <Field label={role === 'student' ? 'Student number or email' : 'Staff number or email'} error={errors.identifier?.message}>
          <input {...register('identifier')} autoComplete="username" className="input" />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input {...register('password')} type="password" autoComplete="current-password" className="input" />
        </Field>

        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-navy-800 hover:underline">Forgot password?</Link></div>

        <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
        <p className="text-center text-sm text-muted">
          New to UniLearn? <Link to="/signup" className="font-semibold text-navy-900 hover:underline">Create an account</Link>
          {' '}or <Link to="/signup?role=student" className="font-semibold text-navy-900 hover:underline">register as a student</Link>
        </p>
      </form>
    </AuthCard>
  )
}

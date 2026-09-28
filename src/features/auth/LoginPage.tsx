import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
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
  const roleParam = searchParams.get('role')
  const role = roleParam === 'student' ? 'student' : 'lecturer'
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const message = (location.state as { message?: string } | null)?.message
  const { data: me } = useMe()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  // Students only have the /student-* pages and /scan, so any other return path would bounce them anyway.
  // A student who opened /scan signed out goes straight back to the scanner after signing in.
  const landing = (r: string) => (r === 'student' && !from.startsWith('/student-') && from !== '/scan' ? '/student-dashboard' : from)

  if (me) return <Navigate to={landing(me.role)} replace />

  // Without ?role= we don't know who this is. The two sides sign in with different
  // credentials (registration number vs staff number) and land on different apps, so
  // ask rather than guess — showing one side's branding to the other was confusing.
  if (roleParam !== 'student' && roleParam !== 'lecturer') {
    return (
      <AuthCard title="Smart Attendance" subtitle="Sign in to continue">
        <div className="space-y-3">
          {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-success">{message}</p>}
          <RoleChoice to="/login?role=student" state={location.state} label="I'm a student" hint="Scan the code in class to be marked present" />
          <RoleChoice to="/login?role=lecturer" state={location.state} label="I'm a lecturer" hint="Run a class and track attendance" />
          {/* Both spelled out: on this screen we don't know which they are, and a single
              "Create an account" here used to land students on the staff-number form. */}
          <p className="pt-2 text-center text-sm text-muted">
            New to UniLearn? Register as a{' '}
            <Link to="/signup?role=student" className="font-semibold text-navy-900 hover:underline">student</Link>
            {' '}or a{' '}
            <Link to="/signup?role=lecturer" className="font-semibold text-navy-900 hover:underline">lecturer</Link>
          </p>
        </div>
      </AuthCard>
    )
  }

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
        <Field label="Password" error={errors.password?.message}>
          <input {...register('password')} type="password" autoComplete="current-password" className="input" />
        </Field>

        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-navy-800 hover:underline">Forgot password?</Link></div>

        <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
        {/* Carries the role across: a student following this must not land on the
            staff-number form, which is what a bare /signup gives them. */}
        <p className="text-center text-sm text-muted">
          New to UniLearn?{' '}
          <Link to={`/signup?role=${role}`} className="font-semibold text-navy-900 hover:underline">
            Create a {role} account
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link to="/login" state={location.state} className="font-semibold text-muted hover:text-navy-900 hover:underline">
            {role === 'student' ? 'Not a student?' : 'Not a lecturer?'} Choose again
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}

/** One side of the "who are you" choice. A link, not a button: it is navigation. */
function RoleChoice({ to, state, label, hint }: { to: string; state: unknown; label: string; hint: string }) {
  return (
    <Link
      to={to}
      state={state}
      className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition hover:border-navy-900 hover:bg-surface"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-navy-900">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  )
}

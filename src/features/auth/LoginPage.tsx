import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, GraduationCap, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
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

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : from} replace />

  return (
    <main className="min-h-dvh bg-navy-900 px-4 py-8 sm:grid sm:place-items-center">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="hidden rounded-2xl border border-white/10 bg-navy-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="grid size-14 place-items-center rounded-2xl bg-gold-500 shadow-lg"><GraduationCap className="size-7" aria-hidden /></span>
            <p className="mt-8 text-sm font-semibold tracking-[0.18em] text-gold-300">UNILEARN ERP</p>
            <h1 className="mt-3 max-w-md text-4xl font-bold leading-tight">One connected campus for every class.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-blue-100">Manage teaching, attendance and academic identity from one secure university workspace.</p>
          </div>
          <p className="text-sm text-blue-200">Secure access for lecturers and students</p>
        </section>
        <form
          onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: (user) => navigate(user.role === 'student' ? '/student-dashboard' : from === '/' ? '/' : from, { replace: true }) }))}
          className="w-full space-y-5 rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          noValidate
        >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500 text-white"><GraduationCap className="size-6" aria-hidden /></span>
          <div>
            <h1 className="text-lg font-bold text-navy-900">{role === 'student' ? 'Student sign in' : 'Lecturer sign in'}</h1>
            <p className="text-sm text-muted">Continue to your {role} portal</p>
          </div>
        </div>

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
        <div className="border-t border-line pt-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">New to UniLearn?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/signup?role=lecturer" className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-navy-900 hover:bg-surface"><span className="flex items-center gap-2"><GraduationCap className="size-4 text-gold-600" /> Lecturer</span><ArrowRight className="size-4" /></Link>
            <Link to="/signup?role=student" className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-navy-900 hover:bg-surface"><span className="flex items-center gap-2"><UserRound className="size-4 text-gold-600" /> Student</span><ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </form>
      </div>
    </main>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-navy-900">
      {label}
      {children}
      {error && <span role="alert" className="block text-xs font-normal text-red-600">{error}</span>}
    </label>
  )
}

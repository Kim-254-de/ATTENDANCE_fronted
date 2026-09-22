import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
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
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const { data: me } = useMe()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  if (me) return <Navigate to={from} replace />

  return (
    <main className="grid min-h-dvh place-items-center bg-navy-900 p-4">
      <form
        onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: () => navigate(from, { replace: true }) }))}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-xl"
        noValidate
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500 text-white"><GraduationCap className="size-6" aria-hidden /></span>
          <div>
            <h1 className="text-lg font-bold text-navy-900">Lecturer Portal</h1>
            <p className="text-sm text-muted">Sign in to manage attendance</p>
          </div>
        </div>

        {login.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(login.error, 'Sign-in failed.')}</p>
        )}

        <Field label="Staff number or email" error={errors.identifier?.message}>
          <input {...register('identifier')} autoComplete="username" className="input" />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input {...register('password')} type="password" autoComplete="current-password" className="input" />
        </Field>

        <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
      </form>
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

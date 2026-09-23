import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
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
    <AuthCard title="Lecturer Portal" subtitle="Sign in to manage attendance">
      <form
        onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: () => navigate(from, { replace: true }) }))}
        className="space-y-5"
        noValidate
      >
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
      <p className="text-center text-sm text-muted">
        New lecturer? <Link to="/register" className="font-semibold text-navy-900 underline-offset-2 hover:underline">Create an account</Link>
      </p>
    </AuthCard>
  )
}

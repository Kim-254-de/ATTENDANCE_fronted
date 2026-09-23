import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { useMe, useSignup } from './authApi'
import { AuthShell } from './AuthShell'

const schema = z.object({
  email: z.string().trim().email('Enter a valid school email'),
  fullName: z.string().trim().min(3, 'Enter your full name'),
  staffNumber: z.string().trim().min(4, 'Enter your staff number'),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
type Values = z.infer<typeof schema>

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') === 'student' ? 'student' : 'lecturer'
  const { data: me } = useMe()
  const signup = useSignup()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })

  if (me) return <Navigate to={me.role === 'student' ? '/student-dashboard' : '/'} replace />

  return <AuthShell title={`Register as a ${role}`} subtitle={<>Already registered? <Link to={`/login?role=${role}`} className="font-semibold text-navy-900 hover:underline">Sign in instead</Link></>}>
    <form className="space-y-5" noValidate onSubmit={handleSubmit(({ confirmPassword: _, ...values }) => signup.mutate({ ...values, role }, { onSuccess: () => navigate(`/login?role=${role}`, { state: { message: 'Account created. Sign in to continue.' } }) }))}>
      {signup.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(signup.error, 'We could not create your account.')}</p>}
      <Field label="School email" error={errors.email?.message}><input {...register('email')} type="email" autoComplete="email" placeholder="j.osei@university.edu.gh" className="input" /></Field>
      <Field label="Full name" error={errors.fullName?.message}><input {...register('fullName')} autoComplete="name" placeholder="Dr. Joseph Kwame Osei" className="input" /></Field>
      <Field label={role === 'student' ? 'Student number' : 'Staff number'} error={errors.staffNumber?.message}><input {...register('staffNumber')} autoComplete="off" placeholder={role === 'student' ? 'STU00042' : 'LEC00123'} className="input" /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" error={errors.password?.message}><input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 8 characters" className="input" /></Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}><input {...register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Repeat password" className="input" /></Field>
      </div>
      <p className="text-xs leading-5 text-muted">Your {role} account will be verified against university records before access is granted.</p>
      <Button type="submit" loading={signup.isPending} className="h-12 w-full">Register as {role}</Button>
    </form>
  </AuthShell>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-semibold text-navy-900">{label}{children}{error && <span role="alert" className="block text-xs font-normal text-red-600">{error}</span>}</label>
}

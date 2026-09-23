import { CheckCircle2, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { useForgotPassword, useMe } from './authApi'
import { AuthShell } from './AuthShell'

const schema = z.object({ email: z.string().trim().email('Enter a valid school email') })
type Values = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { data: me } = useMe()
  const request = useForgotPassword()
  const [submittedEmail, setSubmittedEmail] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })

  if (me) return <Navigate to="/" replace />

  return <AuthShell title="Reset your password" subtitle={<>Remembered your password? <Link to="/login" className="font-semibold text-navy-900 hover:underline">Back to sign in</Link></>}>
    {submittedEmail ? <div className="space-y-5" role="status">
      <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-success"><CheckCircle2 className="size-7" aria-hidden /></div>
      <div><h2 className="text-xl font-bold text-navy-900">Check your inbox</h2><p className="mt-2 text-sm leading-6 text-muted">If an account exists for <strong className="text-navy-900">{submittedEmail}</strong>, reset instructions will arrive shortly. Remember to check your spam folder.</p></div>
      <Link to="/login" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-navy-900 hover:bg-surface">Return to sign in</Link>
    </div> : <form className="space-y-5" noValidate onSubmit={handleSubmit((values) => request.mutate(values.email, { onSuccess: () => setSubmittedEmail(values.email) }))}>
      <div className="grid size-14 place-items-center rounded-2xl bg-gold-100 text-gold-600"><Mail className="size-7" aria-hidden /></div>
      <p className="text-sm leading-6 text-muted">Enter the school email connected to your lecturer account and we will send you a secure password reset link.</p>
      {request.isError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(request.error, 'We could not process your request.')}</p>}
      <label className="block space-y-1.5 text-sm font-semibold text-navy-900">School email<input {...register('email')} type="email" autoComplete="email" placeholder="j.osei@university.edu.gh" className="input" />{errors.email && <span role="alert" className="block text-xs font-normal text-red-600">{errors.email.message}</span>}</label>
      <Button type="submit" loading={request.isPending} className="h-12 w-full">Send reset link</Button>
    </form>}
  </AuthShell>
}

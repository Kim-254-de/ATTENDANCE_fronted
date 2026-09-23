import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage } from '@/lib/api'
import { AuthShell } from './AuthShell'
import { useVerifyEmail } from './authApi'

/** Landing page for the link in the registration email: /verify-email?token=… */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const verify = useVerifyEmail(token)

  return (
    <AuthShell title="Email confirmation">
      <div className="space-y-5">
      {!token ? (
        <Notice ok={false}>This link is missing its confirmation token. Open the link from your email again.</Notice>
      ) : verify.isPending ? (
        <p role="status" className="text-sm text-muted">Confirming your email address…</p>
      ) : verify.isError ? (
        <Notice ok={false}>{errorMessage(verify.error, 'This confirmation link is not valid.')}</Notice>
      ) : (
        <Notice ok>{verify.data.message}</Notice>
      )}
      <Link to="/login" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-navy-900 hover:bg-surface">Go to sign in</Link>
      </div>
    </AuthShell>
  )
}

function Notice({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const Icon = ok ? CircleCheck : CircleAlert
  return (
    <div role={ok ? 'status' : 'alert'} className={`flex gap-3 rounded-xl p-4 text-sm ${ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

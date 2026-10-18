import { useId, useState, type FormEvent } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import { useDeleteAccount, useMe } from './authApi'

/**
 * Shared between the lecturer and student profile pages. Hidden behind a
 * button, then confirmed with the password: a session left open on a shared
 * computer must not be enough to delete an account.
 *
 * The backend anonymises rather than erases (auth.deletion.ts): attendance
 * already taken still counts in the class figures, without a name on it.
 */
export function DeleteAccountCard() {
  const { data: me } = useMe()
  const deleteAccount = useDeleteAccount()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const passwordId = useId()

  if (!me || (me.role !== 'student' && me.role !== 'lecturer')) return null
  const role = me.role

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    deleteAccount.mutate(password, {
      onSuccess: () =>
        navigate(`/login?role=${role}`, { replace: true, state: { message: 'Your account has been deleted.' } }),
    })
  }

  const close = () => {
    setOpen(false)
    setPassword('')
    deleteAccount.reset()
  }

  return (
    <Card className="border-red-200 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><AlertTriangle className="size-5" aria-hidden /></span>
        <div>
          <h3 className="font-bold text-navy-900">Delete account</h3>
          <p className="mt-1 text-sm text-muted">
            {role === 'student'
              ? 'Removes your name, email, photo, passkeys and any registered face, fingerprint or card. Classes you attended still count in your lecturers’ figures, without your name.'
              : 'Removes your name, email, photo and passkeys, and closes any class still open. Your units and past sessions stay in the department’s figures, without your name.'}{' '}
            This cannot be undone.
          </p>
        </div>
      </div>
      {open ? (
        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <div>
            <label htmlFor={passwordId} className="block text-sm font-semibold text-navy-900">
              {smartttAccounts() ? 'Your SMARTTT password' : 'Your password'}
            </label>
            <input
              id={passwordId}
              className="input mt-2"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
          </div>
          {deleteAccount.isError && <p role="alert" className="text-sm text-red-600">{errorMessage(deleteAccount.error)}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              loading={deleteAccount.isPending}
              disabled={!password}
            >
              <Trash2 className="size-4" aria-hidden /> Delete my account
            </Button>
            <Button type="button" variant="secondary" onClick={close} disabled={deleteAccount.isPending}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button variant="danger" className="mt-5" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" aria-hidden /> Delete account…
        </Button>
      )}
    </Card>
  )
}

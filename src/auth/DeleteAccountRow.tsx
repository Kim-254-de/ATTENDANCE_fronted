import { useId, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { smartttAccounts } from '@/lib/env'
import { useDeleteAccount, useMe } from './authApi'

/**
 * The last thing on the lecturer and student profile pages: a quiet red row, not a
 * card, so it is easy to find without drawing the eye. Opens to a password
 * confirmation: a session left open on a shared
 * computer must not be enough to delete an account.
 *
 * The backend anonymises rather than erases (auth.deletion.ts): attendance
 * already taken still counts in the class figures, without a name on it.
 */
export function DeleteAccountRow() {
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
    <div className="px-1">
      {open ? (
        <form className="space-y-3 rounded-2xl border border-danger/30 bg-card p-5" onSubmit={onSubmit}>
          <p className="font-semibold text-ink">Delete account</p>
          <div>
            <label htmlFor={passwordId} className="block text-sm font-semibold text-ink">
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
          {deleteAccount.isError && <p role="alert" className="text-sm text-danger">{errorMessage(deleteAccount.error)}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              loading={deleteAccount.isPending}
              disabled={!password}
            >
              <Trash2 className="size-4" aria-hidden /> {role === 'lecturer' ? 'Delete account' : 'Delete my account'}
            </Button>
            <Button type="button" variant="secondary" onClick={close} disabled={deleteAccount.isPending}>Cancel</Button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-danger hover:underline">
          <Trash2 className="size-4" aria-hidden /> Delete account
        </button>
      )}
    </div>
  )
}

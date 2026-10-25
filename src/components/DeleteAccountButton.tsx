import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { api, errorMessage } from '@/lib/api'

type Scope = 'department'
type Kind = 'lecturer' | 'student'

const BASE: Record<Scope, string> = { department: '/departments' }

/**
 * Lets a department officer delete a lecturer's or student's account in
 * their department (DELETE /departments/{lecturers|students}/:id).
 * The backend anonymises it: the attendance figures stay, the name goes. On
 * success every query of the portal is refetched, so lists and counts drop the
 * account.
 */
export function DeleteAccountButton({
  scope,
  kind,
  userId,
  name,
  compact,
  onDeleted,
}: {
  scope: Scope
  kind: Kind
  userId: string
  name: string | null
  /** Icon only, for table rows. */
  compact?: boolean
  onDeleted?: () => void
}) {
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`${BASE[scope]}/${kind}s/${userId}`)
    },
    onSuccess: async () => {
      onDeleted?.()
      await qc.invalidateQueries({ queryKey: [scope] })
    },
  })

  const who = name ?? `this ${kind}`
  const onClick = () => {
    const consequence = kind === 'lecturer'
      ? 'They are signed out, any class they have open is closed, and their units and past sessions stay in the figures without their name.'
      : 'They are signed out, their registered face, fingerprint and card are removed, and their past attendance stays in the figures without their name.'
    if (!window.confirm(`Delete ${who}'s account? ${consequence} This cannot be undone.`)) return
    remove.mutate(undefined, { onError: (error) => window.alert(errorMessage(error, 'Could not delete the account.')) })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={remove.isPending}
      aria-label={`Delete ${who}'s account`}
      title={compact ? 'Delete account' : undefined}
      className={clsx(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60',
        compact ? 'p-2' : 'border border-danger/30 px-3 py-2',
      )}
    >
      <Trash2 className="size-4" aria-hidden />
      {!compact && (remove.isPending ? 'Deleting…' : 'Delete account')}
    </button>
  )
}

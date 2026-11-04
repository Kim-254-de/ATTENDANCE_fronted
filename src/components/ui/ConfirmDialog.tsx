import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

/**
 * Asks before an action that can't be taken back, naming what will happen.
 * Focus starts on Cancel, so Enter or Escape never does the action by accident.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
  error,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  pending?: boolean
  /** The failed request's message, shown in the dialog so the person can try again. */
  error?: string | null
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => cancelRef.current?.focus(), [])

  return (
    <Dialog title={title} onClose={onClose}>
      <div className="text-sm text-muted">{children}</div>
      {error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={pending}>{confirmLabel}</Button>
      </div>
    </Dialog>
  )
}

import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { errorMessage } from '@/lib/api'

export interface ConfirmRequest {
  title: string
  /** What will happen, in plain words. */
  message: ReactNode
  confirmLabel: string
  /** Runs on confirm. The dialog shows progress, closes when it resolves, and shows the error if it throws. */
  action: () => unknown
  /** Shown when the failure has no message of its own. */
  errorFallback?: string
}

/**
 * The app's replacement for `window.confirm`: `ask({...})` opens a ConfirmDialog
 * and `dialog` is rendered wherever the page puts it.
 *
 *   const [ask, dialog] = useConfirm()
 *   ask({ title: 'Remove MATH 241?', message: '…', confirmLabel: 'Remove', action: () => remove.mutateAsync(id) })
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = (next: ConfirmRequest) => {
    setError(null)
    setRequest(next)
  }
  const close = () => {
    if (pending) return
    setRequest(null)
    setError(null)
  }
  const confirm = async () => {
    if (!request) return
    setPending(true)
    setError(null)
    try {
      await request.action()
      setRequest(null)
    } catch (err) {
      setError(errorMessage(err, request.errorFallback ?? 'That didn’t work. Try again.'))
    } finally {
      setPending(false)
    }
  }

  const dialog = request && (
    <ConfirmDialog title={request.title} confirmLabel={request.confirmLabel} onConfirm={confirm} onClose={close} pending={pending} error={error}>
      {request.message}
    </ConfirmDialog>
  )
  return [ask, dialog] as const
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { errorMessage } from '@/lib/api'
import { useSetGeofence } from './sessionApi'

/** Opens a class waiting for its location with the location check off, after saying what that means. */
export function SkipLocationDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const setGeofence = useSetGeofence(sessionId)
  return (
    <ConfirmDialog
      title="Open without a location check?"
      confirmLabel="Open without a check"
      onConfirm={() => setGeofence.mutate({ mode: 'OFF' }, { onSuccess: onClose })}
      onClose={onClose}
      pending={setGeofence.isPending}
      error={setGeofence.error ? errorMessage(setGeofence.error, 'Could not open the class.') : null}
    >
      Anyone with the code could check in from anywhere, not only from the room.
    </ConfirmDialog>
  )
}

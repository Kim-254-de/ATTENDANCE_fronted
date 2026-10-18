import { CircleCheck, LocateFixed, MapPin, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { bestPosition } from '@/lib/geolocation'
import type { DeviceLocation, SessionSummary } from '@/types'
import { useLiveSessions, useSetGeofence } from './sessionApi'

/**
 * Opened on the lecturer's phone, signed in to the same account as the laptop
 * showing the QR code. A laptop has no GPS, so in a room nobody has surveyed
 * the class waits (AWAITING_LOCATION) until the phone, standing in the room,
 * sends where it is. Students' check-ins are then measured from this point.
 */
export function ShareLocationPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const live = useLiveSessions()
  const session = live.data?.find((s) => s.id === sessionId)

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link to="/lecturer-dashboard" className="text-sm font-semibold text-navy-900 underline">‹ Dashboard</Link>
      {live.isPending ? (
        <p className="text-sm text-muted" role="status">Finding your class…</p>
      ) : live.error ? (
        <Card className="p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(live.error, 'Could not load your classes.')}</p>
        </Card>
      ) : !session ? (
        <Card className="space-y-2 p-5">
          <p className="font-semibold text-navy-900">This class isn't running</p>
          <p className="text-sm text-muted">It has ended, or it was activated from another lecturer's account.</p>
        </Card>
      ) : (
        <ShareLocationCard session={session} />
      )}
    </div>
  )
}

export function ShareLocationCard({ session }: { session: SessionSummary }) {
  const setGeofence = useSetGeofence(session.id)
  const [reading, setReading] = useState<DeviceLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const { mode, roomCode, anchorAccuracyMetres } = session.geofence

  const share = async () => {
    setLocateError(null)
    setReading(null)
    setLocating(true)
    try {
      const location = await bestPosition({ onReading: setReading })
      setGeofence.mutate({ mode: 'ON', location })
    } catch (error) {
      setLocateError(error instanceof Error ? error.message : 'Could not get your location.')
    } finally {
      setLocating(false)
    }
  }

  const skip = () => {
    if (window.confirm('Open this class without checking where students are? Anyone with the code could check in from anywhere.')) {
      setGeofence.mutate({ mode: 'OFF' })
    }
  }

  const busy = locating || setGeofence.isPending
  const room = roomCode ? ` ${roomCode}` : ''

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><MapPin className="size-5" aria-hidden /></span>
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{session.unitCode}</p>
          <p className="truncate font-semibold text-navy-900">{session.unitName ?? session.title ?? 'Class session'}</p>
        </div>
      </div>

      {mode === 'ROOM' ? (
        <Status>
          Room{room}'s location is already on file, so there's nothing to share. Students are checked against it.
        </Status>
      ) : setGeofence.isSuccess && mode !== 'OFF' ? (
        <Status>
          Location shared (accurate to about {Math.round(anchorAccuracyMetres ?? 0)} m). The QR code is now showing on your other screen.
        </Status>
      ) : mode === 'AWAITING_LOCATION' ? (
        <p className="text-sm text-navy-900">
          Your class is waiting for its location. Stand inside{room ? ` room${room}` : ' the room'}, near the middle, and share this phone's location.
          Students' check-ins will be measured from here.
        </p>
      ) : mode === 'LECTURER_DEVICE' ? (
        <Status>
          Location set (accurate to about {Math.round(anchorAccuracyMetres ?? 0)} m). Share again if it was taken somewhere else.
        </Status>
      ) : (
        <p className="text-sm text-navy-900">The location check is off for this class. Share this phone's location to switch it on.</p>
      )}

      {locating && (
        <p className="text-sm text-muted" role="status">
          Getting a precise fix…{reading && <> accurate to about <b className="tabular-nums">{Math.round(reading.accuracy)} m</b></>}
        </p>
      )}
      {(locateError || setGeofence.error) && (
        <p role="alert" className="flex gap-2 text-sm text-red-600">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {locateError ?? errorMessage(setGeofence.error, 'Could not share your location.')}
        </p>
      )}

      {mode !== 'ROOM' && (
        <div className="space-y-2">
          <Button className="w-full" onClick={share} loading={busy} disabled={busy}>
            <LocateFixed className="size-4" aria-hidden />
            {mode === 'AWAITING_LOCATION' || mode === 'OFF' ? "Share this phone's location" : 'Share location again'}
          </Button>
          {mode === 'AWAITING_LOCATION' && (
            <Button variant="ghost" className="w-full" onClick={skip} disabled={busy}>
              Open without a location check
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-sm text-navy-900">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

import { ArrowLeft, CheckCircle2, MapPin, QrCode, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import type { CheckInResult } from '@/types'
import { checkInFailureKind, looksLikeAttendanceCode, useCheckIn } from './checkInApi'
import { QrCameraScanner } from './QrCameraScanner'
import { useCheckInLocation, type LocationStatus } from './useCheckInLocation'

type ScanState =
  | { step: 'scanning'; hint?: string }
  /** `locating`: waiting a few seconds for a precise enough position before sending. */
  | { step: 'checking'; locating: boolean }
  | { step: 'success'; result: CheckInResult }
  | { step: 'already'; message: string }
  | { step: 'failed'; message: string }

/** A stale or misread code clears itself: the student just keeps pointing at the screen. */
const RESCAN_HINT_MS = 4000

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/**
 * Student check-in: point the phone at the QR code the lecturer is projecting.
 *
 * The code changes about every minute and is signed by the server, so the page
 * only reads it and posts it to POST /attendance/check-in — every rule (the
 * code is current, the class is open, the student is in the room, the student
 * is on the unit's roster, one check-in per class) is enforced there.
 *
 * The phone's position is sent with the code, for classes whose lecturer has
 * the location check on. It is watched from the moment the scanner opens, so
 * a precise fix is usually ready by the time the code is read.
 */
export function ScanPage() {
  const checkIn = useCheckIn()
  const location = useCheckInLocation()
  const [state, setState] = useState<ScanState>({ step: 'scanning' })
  // The camera reads several frames a second; only the first read of a code may submit.
  const busy = useRef(false)
  // Codes the server already refused. The camera keeps seeing the same code until the
  // lecturer's screen rotates, and resending it would only log another failed attempt.
  const refused = useRef(new Set<string>())
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  const showHint = (hint: string) => {
    setState({ step: 'scanning', hint })
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setState((s) => (s.step === 'scanning' ? { step: 'scanning' } : s)), RESCAN_HINT_MS)
  }

  // QrCameraScanner always calls the latest onScan, so this needn't be memoised.
  const handleScan = (text: string) => {
    if (busy.current || refused.current.has(text.trim())) return
    if (!looksLikeAttendanceCode(text)) {
      showHint("That isn't an attendance code. Point the camera at the code your lecturer is showing.")
      return
    }
    busy.current = true
    setState({ step: 'checking', locating: true })
    void location.fixForCheckIn().then((fix) => submit(text, fix))
  }

  const submit = (text: string, fix: Awaited<ReturnType<typeof location.fixForCheckIn>>) => {
    setState({ step: 'checking', locating: false })
    checkIn.mutate({ payload: text, location: fix }, {
      onSuccess: (result) => setState({ step: 'success', result }),
      onError: (error) => {
        const message = errorMessage(error, 'Your attendance could not be recorded. Please try again.')
        const kind = checkInFailureKind(error)
        refused.current.add(text.trim())
        if (kind === 'rescan') showHint(message)
        else if (kind === 'done') setState({ step: 'already', message })
        else setState({ step: 'failed', message })
      },
      onSettled: () => { busy.current = false },
    })
  }

  // "Scan again" is a deliberate retry (e.g. the lecturer resumed a paused class): allow every code again.
  const scanAgain = () => {
    refused.current.clear()
    setState({ step: 'scanning' })
  }
  const cameraOn = state.step === 'scanning' || state.step === 'checking'

  return (
    <main className="student-portal min-h-dvh bg-blue-50 p-4 sm:p-8">
      <div className="mx-auto max-w-md space-y-5">
        <Link to="/student-dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy-900">
          <ArrowLeft className="size-4" aria-hidden /> Dashboard
        </Link>

        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-700">CHECK IN</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900">Scan the class QR code</h1>
          <p className="mt-2 text-sm text-muted">Point your camera at the code your lecturer is showing. It changes every minute, so scan it live in class.</p>
        </div>

        {cameraOn && (
          <div className="space-y-3">
            <div className="relative">
              <QrCameraScanner onScan={handleScan} paused={state.step === 'checking'} />
              {state.step === 'checking' && (
                <div role="status" className="absolute inset-0 grid place-items-center rounded-2xl bg-navy-900/70 text-sm font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    {state.locating
                      ? `Getting your location…${location.accuracy !== null ? ` ±${Math.round(location.accuracy)} m` : ''}`
                      : 'Recording your attendance…'}
                  </span>
                </div>
              )}
            </div>
            {state.step === 'scanning' && state.hint ? (
              <p role="alert" className="rounded-xl bg-gold-100 px-4 py-3 text-sm text-navy-900">{state.hint}</p>
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted"><QrCode className="size-4" aria-hidden /> Hold steady until the code is inside the frame.</p>
            )}
            <LocationLine status={location.status} accuracy={location.accuracy} />
          </div>
        )}

        {state.step === 'success' && (
          <Card className="space-y-4 p-6 text-center" role="status">
            <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
            <div>
              <h2 className="text-xl font-bold text-navy-900">You're marked present</h2>
              <p className="mt-1 text-sm text-muted">{state.result.unitCode} · recorded at {formatTime(state.result.recordedAt)}</p>
            </div>
            <Link to="/student-dashboard" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-navy-900 text-sm font-semibold text-white">Done</Link>
          </Card>
        )}

        {state.step === 'already' && (
          <Card className="space-y-4 p-6 text-center" role="status">
            <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
            <div>
              <h2 className="text-xl font-bold text-navy-900">Already checked in</h2>
              <p className="mt-1 text-sm text-muted">{state.message}</p>
            </div>
            <Link to="/student-dashboard" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-navy-900 text-sm font-semibold text-white">Done</Link>
          </Card>
        )}

        {state.step === 'failed' && (location.status === 'denied' || location.status === 'unavailable') && (
          <LocationLine status={location.status} accuracy={location.accuracy} />
        )}

        {state.step === 'failed' && (
          <Card className="space-y-4 p-6 text-center" role="alert">
            <XCircle className="mx-auto size-12 text-red-600" aria-hidden />
            <div>
              <h2 className="text-xl font-bold text-navy-900">Not checked in</h2>
              <p className="mt-1 text-sm text-muted">{state.message}</p>
            </div>
            <Button variant="secondary" className="w-full" onClick={scanAgain}>
              <RotateCcw className="size-4" aria-hidden /> Scan again
            </Button>
          </Card>
        )}
      </div>
    </main>
  )
}

/**
 * Where the phone's position stands, so a student isn't surprised by a refusal:
 * classes with a location check need it, precise, and over https.
 */
function LocationLine({ status, accuracy }: { status: LocationStatus; accuracy: number | null }) {
  if (status === 'denied') {
    return (
      <p role="note" className="flex gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        Location is blocked for this site. Most classes need it to check you in: allow location in your browser's site settings, then reload this page.
      </p>
    )
  }
  if (status === 'unavailable') {
    return (
      <p role="note" className="flex gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        This browser can't share your location, which most classes need. Open this page in Chrome or Safari over https.
      </p>
    )
  }
  const precise = accuracy !== null && accuracy <= 20
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      <MapPin className={`size-4 ${precise ? 'text-green-600' : ''}`} aria-hidden />
      {accuracy === null
        ? 'Finding your location…'
        : precise
          ? `Location ready (±${Math.round(accuracy)} m)`
          : `Improving your location… ±${Math.round(accuracy)} m. Make sure precise location is on.`}
    </p>
  )
}

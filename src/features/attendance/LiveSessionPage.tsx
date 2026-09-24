import { ArrowLeft, Pause, PictureInPicture2, Play, TriangleAlert } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { formatElapsed } from '@/lib/format'
import type { SessionAttendance, SessionStatus, SessionSummary } from '@/types'
import { clearActiveSessionId, useSessionAttendance, useSessionQr, useSetSessionStatus } from './sessionApi'

const subscribeToSeconds = (notify: () => void) => {
  const t = setInterval(notify, 1000)
  return () => clearInterval(t)
}
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000
function useNow() {
  return useSyncExternalStore(subscribeToSeconds, currentSecond)
}

/**
 * The screen a lecturer projects. Deliberately full-bleed with no dashboard
 * chrome: this is the thing students look at, not something the lecturer
 * reads, so it stays legible from the back of a hall and keeps running while
 * they carry on teaching.
 */
export function LiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const now = useNow()

  // `override` is the last status we confirmed ourselves (initial nav state, or a pause/resume/close
  // we just made). Until we've made one, the session shown is whatever the QR poll last reported —
  // derived at render time so there's no query-result-into-state effect to keep in sync.
  const [override, setOverride] = useState<SessionSummary | null>((location.state as { session?: SessionSummary } | null)?.session ?? null)
  const canPoll = override === null || override.status === 'OPEN'
  const qr = useSessionQr(sessionId, canPoll)
  const setStatus = useSetSessionStatus(sessionId)
  const session = override ?? qr.data?.session ?? null

  const changeStatus = (status: SessionStatus) => {
    setStatus.mutate(status, {
      onSuccess: (updated) => {
        setOverride(updated)
        if (status === 'CLOSED') clearActiveSessionId()
      },
    })
  }

  const endClass = () => {
    if (window.confirm('End this class? Students will no longer be able to check in.')) changeStatus('CLOSED')
  }

  const secondsLeft = qr.data ? Math.max(0, Math.round((new Date(qr.data.rotatesAt).getTime() - now) / 1000)) : null
  const elapsed = session ? formatElapsed(now - new Date(session.opensAt).getTime()) : null

  const attendance = useSessionAttendance(sessionId, session?.status === 'OPEN')
  // The QR poll carries the roster size; the attendance poll is fresher on who has arrived.
  const capacity = qr.data?.enrolled
  const checkedIn = attendance.data?.checkedIn ?? qr.data?.checkedIn

  return (
    <div className="flex min-h-dvh flex-col bg-navy-950 text-white">
      <header className="flex items-center gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/')}
          className="rounded-lg p-2 hover:bg-white/10"
          aria-label="Back to dashboard (class stays live)"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center leading-tight">
          {session ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">{session.unitCode}</p>
              <p className="truncate font-semibold">{session.unitName ?? session.title ?? 'Class session'}</p>
            </>
          ) : (
            <p className="font-semibold">Live session</p>
          )}
        </div>
        <StatusBadge status={session?.status} />
      </header>

      {checkedIn !== undefined && <CheckedInStat checkedIn={checkedIn} capacity={capacity} />}

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {session?.status === 'CLOSED' ? (
          <ClosedState onDone={() => navigate('/')} />
        ) : session?.status === 'PAUSED' ? (
          <PausedState />
        ) : qr.data ? (
          <>
            <QrPanel payload={qr.data.payload} />
            <div>
              <p className="text-sm text-sky-300" role="timer" aria-live="off">
                Refreshes in <b className="tabular-nums text-white">{secondsLeft}s</b>
              </p>
              {elapsed && <p className="text-xs text-sky-400">Class running for {elapsed}</p>}
            </div>
          </>
        ) : qr.error ? (
          <ErrorState message={errorMessage(qr.error, 'Could not load this session.')} onBack={() => navigate('/')} />
        ) : (
          <p className="text-sky-300" role="status">Starting session…</p>
        )}

        {attendance.data && attendance.data.attendees.length > 0 && <Attendees attendees={attendance.data.attendees} />}

        {session && session.status !== 'CLOSED' && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => changeStatus(session.status === 'PAUSED' ? 'OPEN' : 'PAUSED')}
              disabled={setStatus.isPending}
            >
              {session.status === 'PAUSED' ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              {session.status === 'PAUSED' ? 'Resume' : 'Pause'}
            </Button>
            <FloatButton payload={session.status === 'OPEN' ? qr.data?.payload : undefined} />
            <Button variant="ghost" onClick={endClass} disabled={setStatus.isPending} className="text-red-300 hover:bg-red-500/10">
              End Class
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

/** The number a lecturer actually keeps glancing at during class: how many of the roster have checked in. */
function CheckedInStat({ checkedIn, capacity }: { checkedIn: number; capacity?: number }) {
  const pct = capacity ? Math.min(100, Math.round((checkedIn / capacity) * 100)) : null
  return (
    <div className="px-6 pb-2">
      <div className="mx-auto max-w-xs">
        <p className="text-center text-3xl font-bold tabular-nums">
          {checkedIn}
          {capacity !== undefined && <span className="text-lg font-medium text-sky-300"> / {capacity}</span>}
        </p>
        <p className="text-center text-xs uppercase tracking-widest text-sky-400">Checked in</p>
        {pct !== null && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10" role="img" aria-label={`${pct}% checked in`}>
            <div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Names as they arrive, newest first, so the lecturer can see check-ins happening without a report. */
function Attendees({ attendees }: { attendees: SessionAttendance['attendees'] }) {
  const SHOWN = 8
  return (
    <section aria-label="Checked-in students" className="w-full max-w-xs text-left">
      <ul className="space-y-1 text-sm">
        {attendees.slice(0, SHOWN).map((a) => (
          <li key={a.id} className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5">
            <span className="truncate">{a.fullName}</span>
            <span className="shrink-0 tabular-nums text-sky-300">
              {new Date(a.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        ))}
      </ul>
      {attendees.length > SHOWN && <p className="mt-1 text-center text-xs text-sky-400">and {attendees.length - SHOWN} more</p>}
    </section>
  )
}

function QrPanel({ payload }: { payload: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={hostRef} className="rounded-3xl bg-white p-6 shadow-2xl" data-qr-host>
      <QRCodeCanvas value={payload} size={272} level="M" marginSize={2} />
    </div>
  )
}

function StatusBadge({ status }: { status?: SessionStatus }) {
  if (!status) return null
  const style = {
    OPEN: 'bg-emerald-400/15 text-emerald-300',
    PAUSED: 'bg-amber-400/15 text-amber-300',
    CLOSED: 'bg-white/10 text-sky-300',
  }[status]
  const label = { OPEN: 'Live', PAUSED: 'Paused', CLOSED: 'Ended' }[status]
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {status === 'OPEN' && <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />}
      {label}
    </span>
  )
}

function PausedState() {
  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">Class is paused</p>
      <p className="text-sm text-sky-300">Students can't check in until you resume, below.</p>
    </div>
  )
}

function ClosedState({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">Class ended</p>
      <p className="text-sm text-sky-300">This session no longer accepts check-ins.</p>
      <Button onClick={onDone}>Back to dashboard</Button>
    </div>
  )
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="space-y-3" role="alert">
      <TriangleAlert className="mx-auto size-8 text-amber-300" aria-hidden />
      <p className="text-sm text-sky-100">{message}</p>
      <Button variant="secondary" onClick={onBack}>Back to dashboard</Button>
    </div>
  )
}

/**
 * The closest a web app gets to "overlay this over other apps": stream the QR
 * canvas into a hidden video and ask the browser for Picture-in-Picture, which
 * floats above every other window/app on Chrome, Edge and Safari alike. There
 * is no way for a website to draw a true system overlay without a native
 * shell, so this is offered where supported and simply hidden otherwise.
 */
function FloatButton({ payload }: { payload?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [floating, setFloating] = useState(false)
  const supported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onEnter = () => setFloating(true)
    const onLeave = () => setFloating(false)
    video.addEventListener('enterpictureinpicture', onEnter)
    video.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter)
      video.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [])

  if (!supported || !payload) return null

  const toggle = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
        return
      }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-qr-host] canvas')
      if (!canvas || !('captureStream' in canvas)) return
      video.srcObject = canvas.captureStream(2)
      await video.play()
      await video.requestPictureInPicture()
    } catch {
      // The browser can refuse PiP (missing gesture, disabled setting); the button just stays put so they can retry.
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={toggle}>
        <PictureInPicture2 className="size-4" aria-hidden />
        {floating ? 'Stop floating' : 'Float over apps'}
      </Button>
      {/* Off-screen, never display:none — hidden video elements can be blocked from entering Picture-in-Picture. */}
      <video ref={videoRef} muted playsInline className="fixed left-0 top-0 -z-10 h-px w-px opacity-0" />
    </>
  )
}

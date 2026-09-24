import { ArrowLeft, Pause, PictureInPicture2, Play, TriangleAlert } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { formatElapsed } from '@/lib/format'
import type { SessionAttendance, SessionStatus, SessionSummary } from '@/types'
import { clearActiveSessionId, useSessionAttendance, useSessionQr, useSetSessionStatus } from './sessionApi'

/**
 * Experimental, Chrome/Edge 116+ only — not yet in the standard DOM lib types.
 * Lets a site open a real floating window at a size it chooses and put live
 * HTML in it (unlike video-based PiP, which is a frozen visual capture).
 */
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

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
            <FloatButton
              payload={session.status === 'OPEN' ? qr.data?.payload : undefined}
              refreshLabel={secondsLeft !== null ? `Refreshes in ${secondsLeft}s` : undefined}
            />
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
 * The closest a web app gets to "overlay this over other apps" — there is no
 * way for a website to draw a true system overlay without a native shell, so
 * this is the platform's one narrow exception: a floating always-on-top window.
 *
 * Two implementations, picked at runtime:
 *  - Document Picture-in-Picture (Chrome/Edge 116+): a real window we choose
 *    the size of and render live HTML into via a portal — the QR stays crisp
 *    and the countdown keeps ticking, because it's the same React tree.
 *  - Classic video Picture-in-Picture (broader support): the QR canvas is
 *    streamed into a hidden <video>, which is a frozen visual capture — no
 *    live countdown, and the window's initial size is the browser's default.
 * Hidden entirely where neither is supported.
 */
function FloatButton({ payload, refreshLabel }: { payload?: string; refreshLabel?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoFloating, setVideoFloating] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const documentPipSupported = typeof window !== 'undefined' && !!window.documentPictureInPicture
  const videoPipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onEnter = () => setVideoFloating(true)
    const onLeave = () => setVideoFloating(false)
    video.addEventListener('enterpictureinpicture', onEnter)
    video.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter)
      video.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [])

  // Closing the floating window (its own close button) must clear our state;
  // leaving this page while it's open (class stays live) must not leak it.
  useEffect(() => {
    if (!pipWindow) return
    const onClose = () => setPipWindow(null)
    pipWindow.addEventListener('pagehide', onClose, { once: true })
    return () => {
      pipWindow.removeEventListener('pagehide', onClose)
      pipWindow.close()
    }
  }, [pipWindow])

  if ((!documentPipSupported && !videoPipSupported) || !payload) return null

  const openDocumentPip = async () => {
    try {
      const win = await window.documentPictureInPicture!.requestWindow({ width: 360, height: 420 })
      copyStylesInto(win.document)
      win.document.body.style.margin = '0'
      win.document.body.style.background = '#0f1b33'
      setPipWindow(win)
    } catch {
      // Refused (missing gesture, disabled setting) — button just stays put so they can retry.
    }
  }

  const toggleVideoPip = async () => {
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

  const floating = documentPipSupported ? !!pipWindow : videoFloating
  const toggle = () => {
    if (documentPipSupported) {
      if (pipWindow) setPipWindow(null) // effect cleanup closes the real window
      else void openDocumentPip()
    } else {
      void toggleVideoPip()
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={toggle}>
        <PictureInPicture2 className="size-4" aria-hidden />
        {floating ? 'Stop floating' : 'Float over apps'}
      </Button>
      {pipWindow &&
        createPortal(
          <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-navy-950 p-4 text-white">
            <QrPanel payload={payload} />
            {refreshLabel && <p className="text-sm text-sky-300">{refreshLabel}</p>}
          </div>,
          pipWindow.document.body,
        )}
      {/* Off-screen, never display:none — hidden video elements can be blocked from entering Picture-in-Picture. */}
      <video ref={videoRef} muted playsInline className="fixed left-0 top-0 -z-10 h-px w-px opacity-0" />
    </>
  )
}

/**
 * A Document PiP window starts with a blank document — none of the page's
 * Tailwind styles apply until copied in. Same-origin stylesheets (Vite's
 * injected <style> tags in dev, bundled CSS in prod) are cloned as rules;
 * anything that throws on `cssRules` (a cross-origin stylesheet) is
 * re-attached as a <link> instead so the browser fetches it itself.
 */
function copyStylesInto(doc: Document): void {
  for (const sheet of document.styleSheets) {
    try {
      const style = doc.createElement('style')
      style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join('\n')
      doc.head.appendChild(style)
    } catch {
      if (sheet.href) {
        const link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        doc.head.appendChild(link)
      }
    }
  }
}

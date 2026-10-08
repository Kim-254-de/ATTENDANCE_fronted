import { AxiosError } from 'axios'
import { ArrowLeft, CheckCircle2, CircleAlert, ScanFace, UserX } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FaceCamera } from '@/components/FaceCamera'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import type { FaceIdentifyResult } from '@/types'
import { useConfirmFace, useIdentifyFace } from './faceApi'
import { useSessionAttendance, useSessionQr } from './sessionApi'

type Match = Extract<FaceIdentifyResult, { result: 'MATCH' }>
type Notice = { tone: 'success' | 'warn' | 'error'; text: string }

type TerminalState =
  | { step: 'ready'; notice?: Notice }
  /** A match is on screen, waiting for the lecturer to confirm or reject it. */
  | { step: 'match'; match: Match }
  /** Nothing more can be done here: the class closed or paused, or this isn't the lecturer's class. */
  | { step: 'stopped'; message: string }

const subscribeToSeconds = (notify: () => void) => {
  const t = setInterval(notify, 1000)
  return () => clearInterval(t)
}
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000

/**
 * The face check-in terminal: for now, the lecturer's phone. Each student
 * steps up, the lecturer photographs them, checks the name that comes back
 * against the person, and taps Confirm. Nothing is recorded before that tap.
 *
 * Face is QR's fallback and QR is face's: a student who already scanned the
 * code shows as already checked in, and the other way round.
 */
export function FaceTerminalPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const qr = useSessionQr(sessionId)
  const attendance = useSessionAttendance(sessionId, true)
  const identify = useIdentifyFace(sessionId)
  const confirm = useConfirmFace(sessionId)
  const [state, setState] = useState<TerminalState>({ step: 'ready' })

  const session = qr.data?.session
  const checkedIn = attendance.data?.checkedIn ?? qr.data?.checkedIn
  const recentFace = attendance.data?.attendees.filter((a) => a.verificationMethod === 'FACE').slice(0, 5) ?? []

  const onCapture = (image: string) => {
    identify.mutate(image, {
      onSuccess: (result) => {
        if (result.result === 'MATCH' && !result.alreadyCheckedIn) setState({ step: 'match', match: result })
        else setState({ step: 'ready', notice: noticeFor(result) })
      },
      onError: (error) => {
        const message = errorMessage(error, 'The photo could not be checked. Try again.')
        if (isFinal(error)) setState({ step: 'stopped', message })
        else setState({ step: 'ready', notice: { tone: 'error', text: message } })
      },
    })
  }

  const confirmMatch = (match: Match) => {
    if (!match.matchToken) return
    confirm.mutate(match.matchToken, {
      onSuccess: (record) => setState({ step: 'ready', notice: { tone: 'success', text: `${record.fullName} is marked present.` } }),
      onError: (error) => {
        const message = errorMessage(error, 'Could not record attendance. Try again.')
        const status = error instanceof AxiosError ? error.response?.status : undefined
        // 410: the match expired; 409: already recorded (e.g. they scanned the QR code meanwhile). Either way, next student.
        if (status === 410 || status === 409) setState({ step: 'ready', notice: { tone: 'warn', text: message } })
        else if (isFinal(error)) setState({ step: 'stopped', message })
        else setState({ step: 'match', match })
      },
    })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-navy-950 text-white">
      <header className="flex items-center gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to={`/session/${sessionId}`} className="rounded-lg p-2 hover:bg-white/10" aria-label="Back to the live session">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-center leading-tight">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">{session?.unitCode ?? 'Face check-in'}</p>
          <p className="truncate font-semibold">Face check-in</p>
        </div>
        {checkedIn !== undefined && (
          <p className="text-right text-sm leading-tight">
            <b className="tabular-nums">{checkedIn}</b>
            {qr.data && <span className="text-sky-300"> / {qr.data.enrolled}</span>}
            <span className="block text-[10px] uppercase tracking-widest text-sky-400">in</span>
          </p>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
        {state.step === 'stopped' ? (
          <div className="space-y-4 py-10 text-center" role="alert">
            <CircleAlert className="mx-auto size-10 text-amber-300" aria-hidden />
            <p className="text-sky-100">{state.message}</p>
            <Link to={`/session/${sessionId}`} className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-navy-900">
              Back to the class
            </Link>
          </div>
        ) : (
          <>
            {state.step === 'match' ? (
              <MatchCard
                match={state.match}
                confirming={confirm.isPending}
                onConfirm={() => confirmMatch(state.match)}
                onReject={() => setState({ step: 'ready', notice: { tone: 'warn', text: 'Not confirmed. Photograph them again, or they can scan the QR code.' } })}
              />
            ) : (
              <p className="flex items-start gap-2 text-sm text-sky-200">
                <ScanFace className="mt-0.5 size-4 shrink-0" aria-hidden />
                One student at a time, face in the oval, at arm's length.
              </p>
            )}

            {state.step === 'ready' && state.notice && <NoticeLine notice={state.notice} />}

            <FaceCamera
              onCapture={onCapture}
              captureLabel={identify.isPending ? 'Checking…' : 'Identify student'}
              disabled={identify.isPending || state.step === 'match'}
            />

            {recentFace.length > 0 && (
              <section aria-label="Recent face check-ins" className="space-y-1 text-sm">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-sky-400">Checked in by face</h2>
                <ul className="space-y-1">
                  {recentFace.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5">
                      <span className="truncate">{a.fullName}</span>
                      <span className="shrink-0 tabular-nums text-sky-300">
                        {new Date(a.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function MatchCard({ match, confirming, onConfirm, onReject }: {
  match: Match
  confirming: boolean
  onConfirm: () => void
  onReject: () => void
}) {
  const now = useSyncExternalStore(subscribeToSeconds, currentSecond)
  const secondsLeft = match.expiresAt ? Math.max(0, Math.round((new Date(match.expiresAt).getTime() - now) / 1000)) : 0
  const expired = secondsLeft === 0
  const { student } = match

  return (
    <section aria-label="Match" className="space-y-4 rounded-2xl bg-white p-4 text-navy-900 shadow-xl">
      <div className="flex items-center gap-4">
        {student.avatarDataUrl ? (
          <img src={student.avatarDataUrl} alt="" className="size-16 rounded-xl object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-xl bg-blue-100 text-xl font-bold text-blue-800" aria-hidden>
            {initials(student.fullName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Is this…</p>
          <p className="truncate text-lg font-bold">{student.fullName}</p>
          {student.registrationNumber && <p className="font-mono text-xs text-muted">{student.registrationNumber}</p>}
          <p className="text-xs text-muted">{Math.round(match.score * 100)}% match</p>
        </div>
      </div>
      {match.facesInFrame > 1 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {match.facesInFrame} faces were in the photo. This is the closest one: make sure it's the student in front of you.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onReject} disabled={confirming}>
          <UserX className="size-4" aria-hidden /> Not them
        </Button>
        <Button variant="lecturer" onClick={onConfirm} loading={confirming} disabled={expired}>
          <CheckCircle2 className="size-4" aria-hidden /> Confirm
        </Button>
      </div>
      <p className="text-center text-xs text-muted" role="timer" aria-live="off">
        {expired ? 'This match has expired. Tap Not them and photograph them again.' : `Confirm within ${secondsLeft}s`}
      </p>
    </section>
  )
}

function NoticeLine({ notice }: { notice: Notice }) {
  const style = {
    success: 'bg-emerald-400/15 text-emerald-200',
    warn: 'bg-amber-400/15 text-amber-100',
    error: 'bg-red-500/15 text-red-100',
  }[notice.tone]
  return <p role={notice.tone === 'success' ? 'status' : 'alert'} className={`rounded-xl px-4 py-3 text-sm ${style}`}>{notice.text}</p>
}

/** What to tell the lecturer when there is nothing to confirm. */
function noticeFor(result: FaceIdentifyResult): Notice {
  if (result.result === 'MATCH') return { tone: 'warn', text: `${result.student.fullName} has already checked in to this class.` }
  if (result.result === 'AMBIGUOUS') {
    return { tone: 'warn', text: "Not sure who this is. Retake the photo with only their face in the oval, in good light." }
  }
  if (result.enrolledOnUnit === 0) {
    return { tone: 'warn', text: "No one on this unit has a registered face yet. Register faces from the unit's student list, or students can scan the QR code." }
  }
  return { tone: 'warn', text: 'Not recognised. Try again, or the student can scan the QR code. Their face may not be registered yet.' }
}

/**
 * Errors retaking the photo won't fix: the class is paused, closed or over
 * (409), or isn't this lecturer's (403/404). A 409 from confirm is handled
 * before this is asked.
 */
function isFinal(error: unknown): boolean {
  const status = error instanceof AxiosError ? error.response?.status : undefined
  return status === 409 || status === 403 || status === 404
}

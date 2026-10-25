import { ArrowLeft } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useSyncExternalStore } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { useCloseExamSession, useExamCode, useExamReport, type ExamReport } from './examsApi'

const subscribeToSeconds = (notify: () => void) => {
  const t = setInterval(notify, 1000)
  return () => clearInterval(t)
}
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000

/**
 * The exam room's screen: its rotating code, as large as the live class's,
 * how many of the seated students have checked in, and who is still absent.
 * `?report=1` (or a closed room) shows only the attendance: the room's, or
 * every room of the paper for the main invigilator.
 */
export function ExamRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const now = useSyncExternalStore(subscribeToSeconds, currentSecond)
  const reportOnly = searchParams.get('report') === '1'

  const code = useExamCode(sessionId, !reportOnly)
  const close = useCloseExamSession(sessionId)
  const live = !reportOnly && !!code.data && !close.isSuccess
  const report = useExamReport(sessionId, live)

  const session = code.data?.session
  const thisRoom = report.data?.rooms.find((r) => r.room === session?.room) ?? (report.data?.rooms.length === 1 ? report.data.rooms[0] : undefined)
  const secondsLeft = code.data ? Math.max(0, Math.round((new Date(code.data.rotatesAt).getTime() - now) / 1000)) : null

  const closeRoom = () => {
    if (window.confirm('Close this room? Students will no longer be able to check in.')) close.mutate()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-brand-950 text-white">
      <header className="flex items-center gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={() => navigate('/exams')} className="rounded-lg p-2 hover:bg-white/10" aria-label="Back to exam rooms (room stays open)">
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center leading-tight">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">{session?.codes ?? report.data?.codes ?? 'Exam'}</p>
          <p className="truncate font-semibold">{session ? `Room ${session.room}` : report.data?.title || 'Exam room'}</p>
        </div>
        <span className="w-9" aria-hidden />
      </header>

      <main className="flex flex-1 flex-col items-center gap-6 p-6 text-center">
        {!reportOnly && !close.isSuccess && (
          code.data ? (
            <>
              {thisRoom && (
                <p className="text-lg font-semibold" role="status">
                  <span className="tabular-nums">{thisRoom.sat.length}</span> of {thisRoom.sat.length + thisRoom.absent.length} checked in
                </p>
              )}
              <div className="rounded-3xl bg-white p-6 shadow-2xl">
                <QRCodeCanvas value={code.data.payload} size={272} level="M" marginSize={2} />
              </div>
              <p className="text-sm text-brand-300" role="timer" aria-live="off">
                Refreshes in <b className="tabular-nums text-white">{secondsLeft}s</b>
              </p>
              <Button variant="ghost" onClick={closeRoom} loading={close.isPending} className="text-red-300 hover:bg-red-500/10">
                Close room
              </Button>
            </>
          ) : code.error ? (
            <p role="alert" className="text-amber-200">{errorMessage(code.error, 'Could not load this room’s code.')}</p>
          ) : (
            <p role="status" className="text-brand-300">Getting the code…</p>
          )
        )}
        {close.isSuccess && <p className="text-lg font-semibold" role="status">Room closed. Check-ins have stopped.</p>}
        {close.error && <p role="alert" className="text-amber-200">{errorMessage(close.error, 'Could not close this room.')}</p>}

        {report.data ? (
          <Report report={report.data} />
        ) : report.error ? (
          <p role="alert" className="text-amber-200">{errorMessage(report.error, 'Could not load the attendance.')}</p>
        ) : null}
      </main>
    </div>
  )
}

function Report({ report }: { report: ExamReport }) {
  return (
    <section aria-label="Exam attendance" className="w-full max-w-3xl space-y-4 text-left">
      {report.rooms.map((r) => (
        <div key={r.room} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Room {r.room}</h2>
            <p className="text-sm text-brand-300">{r.sat.length} sat · {r.absent.length} absent</p>
          </div>
          {r.absent.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold tracking-widest text-amber-200">ABSENT</p>
              <ul aria-label={`Absent in ${r.room}`} className="mt-1 flex flex-wrap gap-1.5 text-sm">
                {r.absent.map((n) => <li key={n} className="rounded-lg bg-white/10 px-2 py-0.5 font-mono">{n}</li>)}
              </ul>
            </div>
          )}
          {r.sat.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold tracking-widest text-emerald-300">SAT</p>
              <ul aria-label={`Sat in ${r.room}`} className="mt-1 flex flex-wrap gap-1.5 text-sm">
                {r.sat.map((n) => <li key={n} className="rounded-lg bg-emerald-400/10 px-2 py-0.5 font-mono">{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

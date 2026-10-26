import clsx from 'clsx'
import { ClipboardList, DoorOpen, MapPin, QrCode, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { bestPosition } from '@/lib/geolocation'
import type { DeviceLocation } from '@/types'
import { canOpenNow, OPEN_EARLY_MINUTES, useMyExamSessions, useOpenExamSession, type ExamSession } from './examsApi'

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const dayKey = (iso: string) => new Date(iso).toDateString()

/**
 * The invigilator's exam rooms, by day. Each opens from half an hour before
 * the paper until it ends; once open it shows a rotating code (ExamRoomPage)
 * that students scan with their usual scanner, and only those seated in the
 * room are let in. The main invigilator's report covers every room of the paper.
 */
export function ExamsPage() {
  const { data: sessions, isPending, error, refetch } = useMyExamSessions()

  if (error) {
    return (
      <Card className="flex items-center justify-between p-5" role="alert">
        <p className="text-sm text-danger">{errorMessage(error, 'Could not load your exam rooms.')}</p>
        <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
      </Card>
    )
  }
  if (isPending || !sessions) {
    return <div className="mx-auto max-w-3xl space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
  }

  const days = new Map<string, ExamSession[]>()
  for (const s of sessions) days.set(dayKey(s.startsAt), [...(days.get(dayKey(s.startsAt)) ?? []), s])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand-ink">INVIGILATION</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">Your exam rooms</h2>
        <p className="mt-1 text-sm text-muted">Open your room from {OPEN_EARLY_MINUTES} minutes before the paper. Students scan its code with the usual check-in scanner.</p>
      </div>
      {sessions.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No invigilation duties from today on.</Card>
      ) : (
        [...days.values()].map((day) => (
          <section key={dayKey(day[0]!.startsAt)} aria-label={dayLabel(day[0]!.startsAt)} className="space-y-3">
            <h3 className="font-semibold text-ink">{dayLabel(day[0]!.startsAt)}</h3>
            {day.map((s) => <ExamRoomCard key={s.id} session={s} />)}
          </section>
        ))
      )}
    </div>
  )
}

function ExamRoomCard({ session }: { session: ExamSession }) {
  const navigate = useNavigate()
  const open = useOpenExamSession(session.id)
  const [locating, setLocating] = useState(false)
  // The room isn't surveyed and this device's fix was too vague: the fence can only be switched off.
  const [needsFenceOff, setNeedsFenceOff] = useState(false)

  const show = () => navigate(`/exam-room/${session.id}`)
  const openRoom = async () => {
    setLocating(true)
    let location: DeviceLocation | undefined
    try {
      location = await bestPosition({ timeoutMs: 10_000 })
    } catch {
      // A surveyed room needs no fix from this device; the backend says if it does.
    }
    setLocating(false)
    open.mutate(location ? { geofence: 'ON', location } : { geofence: 'ON' }, {
      onSuccess: show,
      onError: (e) => {
        if (e instanceof AxiosError && (e.response?.data as { code?: string } | undefined)?.code === 'GEOFENCE_ANCHOR_UNAVAILABLE') setNeedsFenceOff(true)
      },
    })
  }
  const openWithoutFence = () => open.mutate({ geofence: 'OFF' }, { onSuccess: show })

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{session.codes}</p>
          {session.title && <p className="text-sm text-muted">{session.title}</p>}
        </div>
        <div className="flex gap-2">
          <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', session.role === 'main' ? 'bg-brand-soft text-brand-ink' : 'bg-surface text-muted')}>
            {session.role === 'main' ? 'Main invigilator' : 'Invigilator'}
          </span>
          <StatusChip status={session.status} />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink">
        <span>{time(session.startsAt)} – {time(session.endsAt)}</span>
        <span className="flex items-center gap-1"><MapPin className="size-4 text-muted" aria-hidden /> {session.room}</span>
        <span className="flex items-center gap-1"><Users className="size-4 text-muted" aria-hidden /> {session.candidates} seated</span>
      </div>
      {open.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {errorMessage(open.error, 'Could not open this room.')}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {session.status === 'OPEN' && (
          <Button onClick={show}><QrCode className="size-4" aria-hidden /> Show code</Button>
        )}
        {canOpenNow(session) && !needsFenceOff && (
          <Button onClick={openRoom} loading={locating || open.isPending}>
            <DoorOpen className="size-4" aria-hidden /> {locating ? 'Getting your location…' : 'Open room'}
          </Button>
        )}
        {canOpenNow(session) && needsFenceOff && (
          <Button onClick={openWithoutFence} loading={open.isPending}>
            <DoorOpen className="size-4" aria-hidden /> Open without the location check
          </Button>
        )}
        {session.status === 'NOT_OPENED' && !canOpenNow(session) && (
          <p className="text-sm text-muted">Opens {OPEN_EARLY_MINUTES} minutes before the paper.</p>
        )}
        {session.status !== 'NOT_OPENED' && (
          <Link
            to={`/exam-room/${session.id}?report=1`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-card px-5 text-sm font-semibold text-ink transition hover:bg-surface"
          >
            <ClipboardList className="size-4" aria-hidden /> {session.role === 'main' ? 'Attendance, all rooms' : 'Attendance'}
          </Link>
        )}
      </div>
    </Card>
  )
}

function StatusChip({ status }: { status: ExamSession['status'] }) {
  const style = { NOT_OPENED: 'bg-surface text-muted', OPEN: 'bg-success-soft text-success', CLOSED: 'bg-surface text-muted' }[status]
  const label = { NOT_OPENED: 'Not opened', OPEN: 'Open', CLOSED: 'Closed' }[status]
  return <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', style)}>{label}</span>
}

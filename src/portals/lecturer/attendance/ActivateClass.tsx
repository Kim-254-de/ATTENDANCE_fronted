import { FingerprintPattern, IdCard, QrCode, ScanFace, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { useCurrentUnit } from '@/portals/lecturer/units/unitsApi'
import { useCreateSession, useLiveSessions } from './sessionApi'

/**
 * The one action a lecturer needs fastest: whatever class the issued
 * timetable says is on right now, go live for it. There is no unit or
 * duration to pick — the backend derives both from the schedule and refuses
 * to open a session outside the scheduled window either way, so this screen
 * just reflects that truth.
 */
export function ActivateClass() {
  const { data: unit, isPending, error, refetch } = useCurrentUnit()
  const liveSessions = useLiveSessions()
  const navigate = useNavigate()
  const create = useCreateSession()
  const activeSession = liveSessions.data?.find((session) =>
    session.unitId === unit?.id && session.status !== 'CLOSED' && new Date(session.closesAt).getTime() > Date.now(),
  )

  const activate = () => {
    if (!unit || activeSession || create.isPending) return
    create.mutate(
      { unitId: unit.id },
      {
        onSuccess: (session) => {
          navigate(`/session/${session.id}`, { state: { session } })
        },
      },
    )
  }

  return (
    <Card className="border border-line p-5">
      <div className="space-y-4">
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage(error, 'Could not load your timetable.')}{' '}
            <button onClick={() => refetch()} className="font-semibold underline">Retry</button>
          </p>
        ) : isPending ? (
          <p className="text-sm text-muted">Checking your timetable…</p>
        ) : !unit ? (
          <p className="text-sm text-muted">
            No class scheduled right now. <Link to="/units" className="font-semibold text-navy-900 underline">View your units</Link>.
          </p>
        ) : (
          <div className="rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-inset ring-blue-100">
            <p className="font-semibold text-navy-900">{unit.name ? `${unit.code} — ${unit.name}` : unit.code}</p>
            {unit.schedule && (
              <p className="text-sm text-muted">{unit.schedule.startTime}–{unit.schedule.endTime} today</p>
            )}
          </div>
        )}

        {!activeSession && <VerificationMethods />}

        {activeSession ? (
          <Link
            to={`/session/${activeSession.id}`}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {activeSession.status === 'PAUSED' ? 'Class paused — reopen session' : 'Class in progress — reopen session'}
          </Link>
        ) : (
          <Button variant="lecturer" className="w-full" onClick={activate} disabled={!unit || isPending || liveSessions.isPending || create.isPending} loading={create.isPending}>
            <Zap className="size-4" aria-hidden /> Activate Class
          </Button>
        )}
        {create.error && <p role="alert" className="text-sm text-red-600">{errorMessage(create.error)}</p>}
      </div>
    </Card>
  )
}

/**
 * QR and facial recognition are both on in every class, each the other's
 * fallback: a student who can't scan is checked in on the lecturer's phone
 * (Face check-in, on the live session), and the other way round. Biometric
 * and ID scan are shown so the roadmap is visible, but are inert.
 */
function VerificationMethods() {
  const methods = [
    { icon: QrCode, label: 'QR Code', active: true },
    { icon: FingerprintPattern, label: 'Biometric', active: false },
    { icon: ScanFace, label: 'Facial Recognition', active: true },
    { icon: IdCard, label: 'Student ID Scan', active: false },
  ]

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Verification method</legend>
      <div className="grid grid-cols-2 gap-2">
        {methods.map(({ icon: Icon, label, active }) => (
          <label
            key={label}
            title={active ? undefined : 'Coming soon'}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              active ? 'border-orange-500/40 bg-orange-50 text-navy-900' : 'border-line text-muted opacity-60'
            }`}
          >
            <input type="checkbox" checked={active} disabled={!active} readOnly className="accent-orange-500" />
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{label}</span>
            {!active && <span className="shrink-0 text-xs">Soon</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

import { FingerprintPattern, IdCard, QrCode, ScanFace, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { useCurrentUnit } from '@/features/units/unitsApi'
import { useCreateSession, setActiveSessionId } from './sessionApi'

/**
 * The one action a lecturer needs fastest: whatever class the issued
 * timetable says is on right now, go live for it. There is no unit or
 * duration to pick — the backend derives both from the schedule and refuses
 * to open a session outside the scheduled window either way, so this screen
 * just reflects that truth.
 */
export function ActivateClass() {
  const { data: unit, isPending, error, refetch } = useCurrentUnit()
  const navigate = useNavigate()
  const create = useCreateSession()

  const activate = () => {
    if (!unit) return
    create.mutate(
      { unitId: unit.id },
      {
        onSuccess: (session) => {
          setActiveSessionId(session.id)
          navigate(`/session/${session.id}`, { state: { session } })
        },
      },
    )
  }

  return (
    <Card className="overflow-hidden border border-gold-500/30">
      <div className="flex items-center gap-3 border-b border-line p-5">
        <span className="grid size-11 place-items-center rounded-xl bg-gold-100 text-gold-600"><Zap className="size-5" aria-hidden /></span>
        <div className="leading-tight">
          <h2 className="font-semibold text-navy-900">Activate Class</h2>
          <p className="text-sm text-muted">Per your timetable — start a session so students can check in</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
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
          <div className="rounded-xl bg-navy-900/5 px-4 py-3">
            <p className="font-semibold text-navy-900">{unit.name ? `${unit.code} — ${unit.name}` : unit.code}</p>
            {unit.schedule && (
              <p className="text-sm text-muted">{unit.schedule.startTime}–{unit.schedule.endTime} today</p>
            )}
          </div>
        )}

        <VerificationMethods />

        <Button className="w-full" onClick={activate} disabled={!unit} loading={create.isPending}>
          <Zap className="size-4" aria-hidden /> Activate Class
        </Button>
        {create.error && <p role="alert" className="text-sm text-red-600">{errorMessage(create.error)}</p>}
      </div>
    </Card>
  )
}

/**
 * Only QR is implemented (src/modules/verification is a placeholder for the
 * rest — see backend README). Shown anyway so the roadmap is visible, but the
 * other three are inert: nothing consumes their state yet.
 */
function VerificationMethods() {
  const methods = [
    { icon: QrCode, label: 'QR Code', active: true },
    { icon: FingerprintPattern, label: 'Biometric', active: false },
    { icon: ScanFace, label: 'Facial Recognition', active: false },
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
              active ? 'border-gold-500/40 bg-gold-50 text-navy-900' : 'border-line text-muted opacity-60'
            }`}
          >
            <input type="checkbox" checked={active} disabled={!active} readOnly className="accent-gold-500" />
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{label}</span>
            {!active && <span className="shrink-0 text-xs">Soon</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

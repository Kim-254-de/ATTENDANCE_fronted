import { Download, QrCode, RefreshCw, XCircle } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useUnits } from '@/features/dashboard/dashboardApi'
import { errorMessage } from '@/lib/api'
import { formatCountdown } from '@/lib/format'
import type { AttendanceSession, VerificationMethod } from '@/types'
import { useCloseSession, useCreateSession, useRefreshSessionQr } from './sessionApi'

const METHODS: { id: VerificationMethod; label: string }[] = [
  { id: 'qr', label: 'QR' },
  { id: 'fingerprint', label: 'Fingerprint' },
  { id: 'rfid', label: 'Smartcard' },
  { id: 'face', label: 'Face' },
]
const DURATIONS = [10, 15, 30, 60, 120]

export function QrGenerator() {
  const unitSelectId = useId()
  const { data: units, isPending: unitsLoading, error: unitsError } = useUnits()
  const [unitId, setUnitId] = useState('')
  const [duration, setDuration] = useState(15)
  const [methods, setMethods] = useState<VerificationMethod[]>(['qr'])
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const canvasWrap = useRef<HTMLDivElement>(null)

  const create = useCreateSession()
  const refresh = useRefreshSessionQr()
  const close = useCloseSession()
  const busy = create.isPending || refresh.isPending || close.isPending
  const error = create.error ?? refresh.error ?? close.error

  const remaining = useCountdown(session?.status === 'open' ? session.expiresAt : undefined)
  const expired = session?.status === 'open' && remaining <= 0
  const active = session?.status === 'open' && !expired
  const unit = units?.find((u) => u.id === unitId)

  const toggleMethod = (m: VerificationMethod) =>
    setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))

  const generate = () =>
    create.mutate({ unitId, durationMinutes: duration, verificationMethods: methods }, { onSuccess: setSession })

  const download = () => {
    const canvas = canvasWrap.current?.querySelector('canvas')
    if (!canvas || !unit) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${unit.code}-attendance-qr.png`
    a.click()
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line p-5">
        <span className="grid size-11 place-items-center rounded-xl bg-gold-100 text-gold-600"><QrCode className="size-5" aria-hidden /></span>
        <div className="leading-tight">
          <h2 className="font-semibold text-navy-900">Generate QR Code</h2>
          <p className="text-sm text-muted">Create an attendance QR for today’s session</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor={unitSelectId} className="sr-only">Unit</label>
          <select
            id={unitSelectId}
            className="input sm:flex-1"
            value={unitId}
            disabled={unitsLoading || !!session?.status && session.status === 'open'}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">{unitsLoading ? 'Loading units…' : 'Select a unit'}</option>
            {units?.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
          </select>
          <Button onClick={generate} disabled={!unitId || methods.length === 0 || active} loading={create.isPending}>Generate</Button>
        </div>
        {unitsError && <p role="alert" className="text-sm text-red-600">{errorMessage(unitsError, 'Could not load your units.')}</p>}

        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <legend className="sr-only">Session rules</legend>
          <label className="flex items-center gap-2 text-muted">
            Window
            <select className="input !h-9 !w-auto" value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={active}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          {METHODS.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 py-2 text-navy-900">
              <input type="checkbox" className="size-4 accent-gold-500" checked={methods.includes(m.id)} onChange={() => toggleMethod(m.id)} disabled={active} />
              {m.label}
            </label>
          ))}
        </fieldset>
        {methods.length === 0 && <p className="text-xs text-red-600">Choose at least one verification method.</p>}
        {error && <p role="alert" className="text-sm text-red-600">{errorMessage(error)}</p>}

        <div className="grid min-h-72 place-items-center rounded-2xl border-2 border-dashed border-line p-6 text-center">
          {session && session.status !== 'closed' ? (
            <div className="space-y-4">
              <div ref={canvasWrap} className={expired ? 'opacity-20' : ''}>
                <QRCodeCanvas value={session.qrToken} size={208} level="M" marginSize={2} />
              </div>
              <p className="text-sm" role="timer" aria-live="off">
                {expired ? <span className="font-semibold text-red-600">Session expired</span> : <>Expires in <b className="tabular-nums text-navy-900">{formatCountdown(remaining)}</b></>}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => refresh.mutate(session.id, { onSuccess: setSession })} disabled={busy || expired}><RefreshCw className="size-4" aria-hidden />Refresh</Button>
                <Button variant="secondary" onClick={download} disabled={expired}><Download className="size-4" aria-hidden />Download</Button>
                <Button variant="ghost" onClick={() => close.mutate(session.id, { onSuccess: () => setSession(null) })} disabled={busy} className="text-red-600"><XCircle className="size-4" aria-hidden />Close session</Button>
              </div>
            </div>
          ) : (
            <div className="text-muted">
              <QrCode className="mx-auto mb-2 size-14 opacity-40" aria-hidden />
              <p className="font-medium opacity-70">Select unit and generate</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

const subscribeToSeconds = (notify: () => void) => {
  const t = setInterval(notify, 1000)
  return () => clearInterval(t)
}
const noSubscription = () => () => {}
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000

/** Milliseconds left until `iso`, re-rendering each second. Returns 0 when no target. */
function useCountdown(iso?: string) {
  const now = useSyncExternalStore(iso ? subscribeToSeconds : noSubscription, currentSecond)
  return iso ? new Date(iso).getTime() - now : 0
}

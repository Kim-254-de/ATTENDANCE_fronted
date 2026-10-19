import clsx from 'clsx'
import { BatteryMedium, Plus, Signal, TabletSmartphone, Wifi, X } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import {
  CAPABILITY_LABEL,
  useCreateTerminal,
  useDecommission,
  useReissuePairing,
  useTerminals,
  type Pairing,
  type Terminal,
  type TerminalCapability,
  type TerminalStatus,
} from './terminalsApi'

/** Devices and Fingerprint enrolment are one area of the portal, with one nav entry. */
export function TerminalTabs() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    clsx('rounded-lg px-4 py-2 text-sm font-semibold transition', isActive ? 'bg-indigo-50 text-indigo-800' : 'text-muted hover:bg-surface')
  return (
    <nav aria-label="Terminals" className="flex gap-2">
      <NavLink to="/department-terminals" end className={tab}>Devices</NavLink>
      <NavLink to="/department-enrolment" className={tab}>Fingerprint enrolment</NavLink>
    </nav>
  )
}

/**
 * The department's portable check-in terminals: wireless handhelds a lecturer
 * carries to class and links by scanning a code on their screen. Each one is
 * paired once with a code shown here, and can be cut off here if it goes
 * missing.
 */
export function TerminalsPage() {
  const { data: terminals, isPending, error, refetch } = useTerminals()
  const [adding, setAdding] = useState(false)
  const [pairing, setPairing] = useState<Pairing | null>(null)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TerminalTabs />
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden /> Add terminal
        </Button>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Terminals your lecturers carry to class. A terminal only records for classes taught by this department's lecturers.
      </p>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load your terminals.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !terminals ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : terminals.length === 0 ? (
        <Card className="p-10 text-center">
          <TabletSmartphone className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-navy-900">No terminals yet</p>
          <p className="mt-1 text-sm text-muted">Add one, then scan its pairing code with the device.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {terminals.map((t) => <TerminalCard key={t.id} terminal={t} onPairing={setPairing} />)}
        </div>
      )}

      {adding && <AddTerminalDialog onClose={() => setAdding(false)} onCreated={(p) => { setAdding(false); setPairing(p) }} />}
      {pairing && <PairingDialog pairing={pairing} onClose={() => setPairing(null)} />}
    </div>
  )
}

const STATUS: Record<TerminalStatus, { label: string; className: string }> = {
  PENDING: { label: 'Waiting to pair', className: 'bg-amber-50 text-amber-800 ring-amber-100' },
  ACTIVE: { label: 'Paired', className: 'bg-emerald-50 text-emerald-800 ring-emerald-100' },
  LOST: { label: 'Lost', className: 'bg-red-50 text-red-700 ring-red-100' },
  RETIRED: { label: 'Retired', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

function TerminalCard({ terminal: t, onPairing }: { terminal: Terminal; onPairing: (p: Pairing) => void }) {
  const reissue = useReissuePairing()
  const decommission = useDecommission()
  const status = STATUS[t.status]

  const repair = () => {
    if (t.status === 'ACTIVE' && !window.confirm(`Pair ${t.code} again? The device stops working until it scans the new code.`)) return
    reissue.mutate(t.id, { onSuccess: onPairing })
  }
  const markLost = () => {
    if (window.confirm(`Mark ${t.code} as lost? It stops recording immediately. You can pair it again if it turns up.`)) {
      decommission.mutate({ terminalId: t.id, action: 'lost' })
    }
  }
  const retire = () => {
    if (window.confirm(`Retire ${t.code}? It can never be used again.`)) decommission.mutate({ terminalId: t.id, action: 'retire' })
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-navy-900">{t.code}</p>
          {t.label && <p className="truncate text-sm text-muted">{t.label}</p>}
        </div>
        <span className={clsx('shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', status.className)}>{status.label}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {t.capabilities.map((c) => (
          <span key={c} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-navy-900">{CAPABILITY_LABEL[c]}</span>
        ))}
      </div>

      {t.status === 'ACTIVE' && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Last seen</dt>
          <dd className="text-navy-900">{t.lastSeenAt ? formatDateTime(t.lastSeenAt) : 'Never'}</dd>
          <dt className="text-muted">Battery</dt>
          <dd className="flex items-center gap-1.5 text-navy-900">
            <BatteryMedium className="size-4 text-muted" aria-hidden />
            {t.batteryPercent !== null ? `${t.batteryPercent}%` : 'Unknown'}
          </dd>
          <dt className="text-muted">Network</dt>
          <dd className="flex items-center gap-1.5 text-navy-900">
            {t.network === 'WIFI' ? <Wifi className="size-4 text-muted" aria-hidden /> : t.network === 'CELLULAR' ? <Signal className="size-4 text-muted" aria-hidden /> : null}
            {t.network === 'WIFI' ? 'Wi-Fi' : t.network === 'CELLULAR' ? 'Mobile data' : 'Unknown'}
          </dd>
          <dt className="text-muted">In class</dt>
          <dd className="text-navy-900">{t.linkedSession ? t.linkedSession.unitCode ?? 'Yes' : 'No'}</dd>
        </dl>
      )}
      {t.status === 'PENDING' && t.pairingExpiresAt && (
        <p className="text-sm text-muted">
          {new Date(t.pairingExpiresAt) > new Date() ? `Pairing code valid until ${formatDateTime(t.pairingExpiresAt)}.` : 'The pairing code has expired. Get a new one.'}
        </p>
      )}

      {t.status !== 'RETIRED' && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={repair} loading={reissue.isPending}>
            {t.status === 'ACTIVE' ? 'Pair again' : 'New pairing code'}
          </Button>
          {t.status !== 'LOST' && (
            <Button variant="ghost" onClick={markLost} disabled={decommission.isPending} className="text-red-600 hover:bg-red-50">Mark lost</Button>
          )}
          <Button variant="ghost" onClick={retire} disabled={decommission.isPending}>Retire</Button>
        </div>
      )}
      {(reissue.error || decommission.error) && (
        <p role="alert" className="text-sm text-red-600">{errorMessage(reissue.error ?? decommission.error)}</p>
      )}
    </Card>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 grid place-items-center bg-navy-950/50 p-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </Card>
    </div>
  )
}

function AddTerminalDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Pairing) => void }) {
  const create = useCreateTerminal()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [capabilities, setCapabilities] = useState<TerminalCapability[]>(['BARCODE', 'FINGERPRINT'])

  const toggle = (c: TerminalCapability) =>
    setCapabilities((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate({ code: code.trim(), ...(label.trim() ? { label: label.trim() } : {}), capabilities }, { onSuccess: onCreated })
  }

  return (
    <Dialog title="Add a terminal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-navy-900">Name</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={64} placeholder="e.g. TERM-01" className="input" />
          <span className="text-xs text-muted">Write it on the device. It can't be changed later.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-navy-900">Description <span className="font-normal text-muted">(optional)</span></span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="e.g. Kept in the department office" className="input" />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-navy-900">What it reads</legend>
          {(Object.keys(CAPABILITY_LABEL) as TerminalCapability[]).map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-navy-900">
              <input type="checkbox" checked={capabilities.includes(c)} onChange={() => toggle(c)} className="size-4" />
              {CAPABILITY_LABEL[c]}
            </label>
          ))}
        </fieldset>
        {create.error && <p role="alert" className="text-sm text-red-600">{errorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending} disabled={!code.trim() || capabilities.length === 0}>Add and get pairing code</Button>
        </div>
      </form>
    </Dialog>
  )
}

/** Shown once: the code is not stored in a form that can be shown again. */
function PairingDialog({ pairing, onClose }: { pairing: Pairing; onClose: () => void }) {
  return (
    <Dialog title={`Pair ${pairing.terminal.code}`} onClose={onClose}>
      <p className="text-sm text-muted">Scan this with the terminal's app, or type the code into it. It works once, until {formatDateTime(pairing.expiresAt)}.</p>
      <div className="mx-auto w-fit rounded-2xl bg-white p-3 ring-1 ring-line">
        <QRCodeCanvas value={pairing.pairingCode} size={200} level="M" marginSize={2} />
      </div>
      <p className="text-center font-mono text-2xl font-semibold tracking-widest text-navy-900">{pairing.pairingCode}</p>
      <Button onClick={onClose} className="w-full">Done</Button>
    </Dialog>
  )
}

import { Clock, Fingerprint, Search, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { TerminalTabs } from './TerminalsPage'
import {
  useCancelCommand,
  useEnrolmentStudents,
  useRequestEnrolment,
  useRevokeFingerprint,
  useTerminals,
  type EnrolmentStudent,
  type Terminal,
} from './terminalsApi'

/**
 * Fingerprint enrolment for the department's students. The department asks
 * here; the terminal does the rest: the next time it reports in it shows the
 * student's name, takes their finger, and the enrolment appears in this list.
 * No fingerprint reaches the server.
 */
export function EnrolmentPage() {
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search.trim())
  const { data: students, isPending, error, refetch } = useEnrolmentStudents(deferred)
  const { data: terminals } = useTerminals()
  const readers = (terminals ?? []).filter((t) => t.status === 'ACTIVE' && t.capabilities.includes('FINGERPRINT'))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TerminalTabs />
      <p className="max-w-2xl text-sm text-muted">
        Students on your lecturers' units. Pick a terminal and press Enrol; the student then puts their finger on that terminal.
        A fingerprint only works on the terminal it was taken on.
      </p>

      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or registration number…"
          aria-label="Search name or registration number"
          className="input pl-10"
        />
      </label>

      {terminals && readers.length === 0 && (
        <Card className="p-4 text-sm text-ink" role="status">
          You have no paired terminal with a fingerprint reader yet. Add one under Devices first.
        </Card>
      )}

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load your students.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !students ? (
        <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : students.length === 0 ? (
        <Card className="p-10 text-center">
          <Fingerprint className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">{deferred ? 'No student matches that search' : 'No students yet'}</p>
          <p className="mt-1 text-sm text-muted">Students appear once they are on a unit taught by one of your lecturers.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {students.map((s) => <StudentRow key={s.registrationNumber} student={s} readers={readers} />)}
        </ul>
      )}
    </div>
  )
}

function StudentRow({ student: s, readers }: { student: EnrolmentStudent; readers: Terminal[] }) {
  const enrol = useRequestEnrolment()
  const cancel = useCancelCommand()
  const revoke = useRevokeFingerprint()
  const [terminalId, setTerminalId] = useState('')

  // A reader the student is already on, or already waiting for, is not offered again.
  const taken = new Set([...s.fingerprints.map((f) => f.terminalCode), ...s.pending.filter((p) => p.kind === 'ENROL_FINGERPRINT').map((p) => p.terminalCode)])
  const available = readers.filter((t) => !taken.has(t.code))
  const chosen = available.some((t) => t.id === terminalId) ? terminalId : available[0]?.id ?? ''

  const remove = (id: string, code: string) => {
    if (window.confirm(`Remove ${s.fullName ?? s.registrationNumber}'s fingerprint from ${code}? It stops working at once.`)) revoke.mutate(id)
  }
  const failure = enrol.error ?? cancel.error ?? revoke.error

  return (
    <li>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{s.fullName ?? 'Name not known yet'}</p>
          <p className="text-sm text-muted">{s.registrationNumber} · {s.unitCodes.join(', ')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.fingerprints.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-success-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-success ring-1 ring-inset ring-success/30">
                <Fingerprint className="size-3" aria-hidden /> {f.terminalCode}{f.label ? ` · ${f.label}` : ''}
                <button onClick={() => remove(f.id, f.terminalCode)} className="rounded-full p-0.5 hover:bg-success-soft" aria-label={`Remove fingerprint on ${f.terminalCode}`}>
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ))}
            {s.pending.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-warning-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-warning ring-1 ring-inset ring-warning/30">
                <Clock className="size-3" aria-hidden />
                {p.kind === 'ENROL_FINGERPRINT' ? `Waiting on ${p.terminalCode}` : `Removing from ${p.terminalCode}`}
                {p.kind === 'ENROL_FINGERPRINT' && (
                  <button onClick={() => cancel.mutate(p.id)} className="rounded-full p-0.5 hover:bg-warning-soft" aria-label={`Cancel enrolment on ${p.terminalCode}`}>
                    <X className="size-3" aria-hidden />
                  </button>
                )}
              </span>
            ))}
            {s.fingerprints.length === 0 && s.pending.length === 0 && <span className="text-xs text-muted">Not enrolled</span>}
          </div>
        </div>

        {available.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`terminal-${s.registrationNumber}`}>Terminal</label>
            <select id={`terminal-${s.registrationNumber}`} value={chosen} onChange={(e) => setTerminalId(e.target.value)} className="input w-auto">
              {available.map((t) => <option key={t.id} value={t.id}>{t.code}</option>)}
            </select>
            <Button
              variant="secondary"
              loading={enrol.isPending}
              onClick={() => enrol.mutate({ terminalId: chosen, registrationNumber: s.registrationNumber })}
            >
              Enrol
            </Button>
          </div>
        )}
        {failure && <p role="alert" className="w-full text-sm text-danger">{errorMessage(failure)}</p>}
      </Card>
    </li>
  )
}

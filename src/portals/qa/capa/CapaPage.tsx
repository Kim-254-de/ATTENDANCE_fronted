import { Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { QA_CAPA_STATUSES, type QaCapaStatus } from '@/types'
import { ExportLinks } from '../exportLinks'
import { TargetFilters } from '../TargetFilters'
import { useCorrectiveActions, useUpdateCapa, type CapaFilters } from './capaApi'

const STATUS_LABELS: Record<QaCapaStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In Progress', VERIFIED: 'Verified', CLOSED: 'Closed' }
const NEXT_STATUS: Record<QaCapaStatus, QaCapaStatus | null> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'VERIFIED', VERIFIED: 'CLOSED', CLOSED: null }
const NEXT_LABEL: Record<QaCapaStatus, string> = { OPEN: 'Start', IN_PROGRESS: 'Mark verified', VERIFIED: 'Close', CLOSED: '' }

/**
 * Corrective action plans: raised against a non-compliant/partial finding,
 * tracked to verified closure. The backend stamps who verified one and
 * when from the signed-in caller — nothing here can set that directly.
 */
export function CapaPage() {
  const [filters, setFilters] = useState<CapaFilters>({})
  const { data: items, isPending, error, refetch } = useCorrectiveActions(filters)
  const update = useUpdateCapa()
  const filtered = Object.values(filters).some((v) => v !== undefined)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Corrective actions raised against non-compliant or partial findings.</p>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">CAPA register</h2>
          <ExportLinks basePath="corrective-actions/export" params={{ ...filters }} label="CAPA register" />
        </div>
        <form aria-label="Corrective action filters" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Status
            <select value={filters.status ?? ''} onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as QaCapaStatus | undefined }))} className="input">
              <option value="">All statuses</option>
              {QA_CAPA_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <TargetFilters
            dates={false}
            value={filters}
            onChange={(next) => setFilters((f) => ({ ...f, targetDepartmentId: next.targetDepartmentId }))}
          />
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-semibold text-ink">
            <input type="checkbox" checked={filters.overdue === true} onChange={(e) => setFilters((f) => ({ ...f, overdue: e.target.checked || undefined }))} />
            Overdue only
          </label>
        </form>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load corrective actions.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !items ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <Wrench className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">{filtered ? 'No corrective actions match these filters' : 'No corrective actions'}</p>
          <p className="mt-1 text-sm text-muted">{filtered ? 'Clear a filter to see more.' : "Raise one from a non-compliant or partial finding on an audit's page."}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const next = NEXT_STATUS[c.status]
            return (
              <Card key={c.id} role="group" aria-label={c.description} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{c.standardCode}</span>
                      {c.isOverdue && <span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Overdue</span>}
                    </div>
                    <p className="mt-1.5 font-medium text-ink">{c.description}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      <Link to={`/qa-audits/${c.auditId}`} className="hover:underline">{c.auditTitle}</Link> · Owner: {c.ownerName} · Due {c.dueDate}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-line px-2.5 py-1 text-xs font-semibold text-ink">{STATUS_LABELS[c.status]}</span>
                </div>
                {c.verifiedByName && (
                  <p className="text-xs text-muted">Verified by {c.verifiedByName}{c.verifiedAt ? ` on ${new Date(c.verifiedAt).toLocaleDateString()}` : ''}.</p>
                )}
                {next && (
                  <div className="border-t border-line pt-3">
                    <Button type="button" variant="secondary" onClick={() => update.mutate({ id: c.id, status: next })} loading={update.isPending && update.variables?.id === c.id}>
                      {NEXT_LABEL[c.status]}
                    </Button>
                  </div>
                )}
                {update.error && update.variables?.id === c.id && <p role="alert" className="text-sm text-danger">{errorMessage(update.error)}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { ArrowLeft, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { QA_FINDING_RATINGS, type QaChecklistViewItem, type QaFindingRating } from '@/types'
import { useCreateCapa } from '../capa/capaApi'
import { ExportLinks } from '../exportLinks'
import { useAudit, useAuditChecklist, useUpdateAudit, useUpsertFinding } from './auditsApi'

const RATING_LABELS: Record<QaFindingRating, string> = {
  COMPLIANT: 'Compliant',
  PARTIAL: 'Partial',
  NON_COMPLIANT: 'Non-compliant',
  NOT_APPLICABLE: 'Not applicable',
}

const STATUS_LABELS: Record<string, string> = { PLANNED: 'Planned', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' }
const NEXT_STATUS: Record<string, string | null> = { PLANNED: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', COMPLETED: null }
const NEXT_LABEL: Record<string, string> = { PLANNED: 'Start audit', IN_PROGRESS: 'Mark completed' }

/** An audit's own page: status transitions plus the "fill checklist" view — one rating per item. */
export function AuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { data: audit, isPending: auditPending, error: auditError, refetch: refetchAudit } = useAudit(auditId)
  const { data: items, isPending: itemsPending, error: itemsError } = useAuditChecklist(auditId)
  const updateAudit = useUpdateAudit(auditId ?? '')

  const nextStatus = audit ? NEXT_STATUS[audit.status] : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/qa-audits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Audits
        </Link>
        {audit && <ExportLinks basePath={`audits/${audit.id}/export`} label="audit report" />}
      </div>

      {auditError ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(auditError, 'Could not load this audit.')}</p>
          <button onClick={() => refetchAudit()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : auditPending || !audit ? (
        <Skeleton className="h-40" />
      ) : (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{audit.title}</h2>
              <p className="mt-0.5 text-sm text-muted">{audit.targetDepartmentName} · {audit.checklistTemplateName} · Scheduled {audit.scheduledDate}</p>
            </div>
            <span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{STATUS_LABELS[audit.status] ?? audit.status}</span>
          </div>
          <p className="text-sm text-muted">{audit.findingsRecorded} of {audit.totalItems} checklist items have a finding.</p>
          {audit.notes && <p className="border-t border-line pt-3 text-sm text-ink">{audit.notes}</p>}
          {nextStatus && (
            <div className="border-t border-line pt-3">
              <Button
                type="button"
                onClick={() => updateAudit.mutate({ status: nextStatus as 'IN_PROGRESS' | 'COMPLETED' })}
                loading={updateAudit.isPending}
              >
                {NEXT_LABEL[audit.status]}
              </Button>
              {updateAudit.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(updateAudit.error)}</p>}
            </div>
          )}
        </Card>
      )}

      {itemsError ? (
        <Card className="p-5 text-sm text-danger" role="alert">{errorMessage(itemsError, 'Could not load the checklist.')}</Card>
      ) : itemsPending || !items ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ChecklistItemRow key={item.checklistItemId} auditId={auditId ?? ''} item={item} locked={audit?.status === 'COMPLETED'} leadAuditorUserId={audit?.leadAuditorUserId} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChecklistItemRow({ auditId, item, locked, leadAuditorUserId }: { auditId: string; item: QaChecklistViewItem; locked: boolean; leadAuditorUserId: string | undefined }) {
  const upsert = useUpsertFinding(auditId)
  const [rating, setRating] = useState<QaFindingRating | ''>(item.finding?.rating ?? '')
  const [evidenceNotes, setEvidenceNotes] = useState(item.finding?.evidenceNotes ?? '')
  const [showCapa, setShowCapa] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) return
    upsert.mutate({ checklistItemId: item.checklistItemId, rating, evidenceNotes: evidenceNotes.trim() || undefined })
  }

  const needsCorrectiveAction = item.finding && (item.finding.rating === 'NON_COMPLIANT' || item.finding.rating === 'PARTIAL')

  return (
    <Card role="group" aria-label={item.prompt} className="space-y-3 p-4">
      <div>
        <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{item.standardCode}</span>
        <p className="mt-1.5 font-medium text-ink">{item.prompt}</p>
        {item.guidance && <p className="mt-0.5 text-sm text-muted">{item.guidance}</p>}
      </div>

      <form onSubmit={save} className="grid gap-3 border-t border-line pt-3 sm:grid-cols-[180px_1fr_auto]">
        <select value={rating} onChange={(e) => setRating(e.target.value as QaFindingRating)} className="input" disabled={locked} required>
          <option value="">Rate…</option>
          {QA_FINDING_RATINGS.map((r) => <option key={r} value={r}>{RATING_LABELS[r]}</option>)}
        </select>
        <input
          value={evidenceNotes}
          onChange={(e) => setEvidenceNotes(e.target.value)}
          placeholder="Evidence notes (optional)"
          className="input"
          disabled={locked}
        />
        <Button type="submit" variant="secondary" loading={upsert.isPending} disabled={locked || !rating}>
          {item.finding ? 'Update' : 'Save'}
        </Button>
      </form>
      {upsert.error && <p role="alert" className="text-sm text-danger">{errorMessage(upsert.error)}</p>}

      {needsCorrectiveAction && item.finding && (
        <div className="border-t border-line pt-3">
          {!showCapa ? (
            <button type="button" onClick={() => setShowCapa(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline">
              <Wrench className="size-4" aria-hidden /> Raise a corrective action
            </button>
          ) : (
            <RaiseCapaForm findingId={item.finding.id} defaultOwnerUserId={leadAuditorUserId} onDone={() => setShowCapa(false)} />
          )}
        </div>
      )}
    </Card>
  )
}

function RaiseCapaForm({ findingId, defaultOwnerUserId, onDone }: { findingId: string; defaultOwnerUserId: string | undefined; onDone: () => void }) {
  const create = useCreateCapa()
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !dueDate || !defaultOwnerUserId) return
    create.mutate(
      { findingId, description: description.trim(), ownerUserId: defaultOwnerUserId, dueDate },
      { onSuccess: () => onDone() },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl bg-surface p-3">
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be fixed?" className="input min-h-16" required />
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input w-auto" required />
        <Button type="submit" loading={create.isPending} disabled={!description.trim() || !dueDate}>Raise</Button>
        <button type="button" onClick={onDone} className="text-sm text-muted hover:underline">Cancel</button>
      </div>
      {create.error && <p role="alert" className="text-sm text-danger">{errorMessage(create.error)}</p>}
    </form>
  )
}

import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMe } from '@/auth/authApi'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { QA_AUDIT_STATUSES, type QaAuditStatus } from '@/types'
import { useChecklistTemplates } from '../checklists/checklistsApi'
import { ExportLinks } from '../exportLinks'
import { TargetFilters } from '../TargetFilters'
import { useAudits, useCreateAudit, useQaDepartments, type AuditFilters } from './auditsApi'

const STATUS_LABELS: Record<string, string> = { PLANNED: 'Planned', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' }
const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-line text-muted',
  IN_PROGRESS: 'bg-warning-soft text-warning',
  COMPLETED: 'bg-success-soft text-success',
}

/** Internal audits: who is being assessed, against which checklist, and how far findings have progressed. */
export function AuditsPage() {
  const [filters, setFilters] = useState<AuditFilters>({})
  const { data: audits, isPending, error, refetch } = useAudits(filters)
  const filtered = Object.values(filters).some(Boolean)
  const { data: me } = useMe()
  const officer = me?.role === 'qa' ? me : undefined
  const { data: departments } = useQaDepartments()
  const { data: templates } = useChecklistTemplates()
  const create = useCreateAudit()

  const [form, setForm] = useState({ title: '', targetId: '', checklistTemplateId: '', scheduledDate: '', notes: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.targetId || !form.checklistTemplateId || !form.scheduledDate || !officer) return
    create.mutate(
      {
        title: form.title.trim(),
        targetDepartmentId: form.targetId,
        checklistTemplateId: form.checklistTemplateId,
        leadAuditorUserId: officer.id,
        scheduledDate: form.scheduledDate,
        notes: form.notes.trim() || undefined,
      },
      { onSuccess: () => setForm({ title: '', targetId: '', checklistTemplateId: '', scheduledDate: '', notes: '' }) },
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Internal audits of one department, against a checklist template. You are the lead auditor.</p>

      <Card className="p-5">
        <h2 className="font-semibold text-ink">New audit</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Title
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" required />
          </label>

          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Department
            <select id="audit-target" value={form.targetId} onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))} className="input" required>
              <option value="">Choose a department…</option>
              {departments?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Checklist template
            <select value={form.checklistTemplateId} onChange={(e) => setForm((f) => ({ ...f, checklistTemplateId: e.target.value }))} className="input" required>
              <option value="">Choose a template…</option>
              {(templates ?? []).filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Scheduled date
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} className="input" required />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Notes (optional)
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input min-h-16" />
          </label>

          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending} disabled={!form.title.trim() || !form.targetId || !form.checklistTemplateId || !form.scheduledDate}>
              Schedule audit
            </Button>
            {create.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(create.error)}</p>}
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Audit register</h2>
          <ExportLinks basePath="audits/export" params={{ ...filters }} label="audit register" />
        </div>
        <form aria-label="Audit filters" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={(e) => e.preventDefault()}>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Status
            <select value={filters.status ?? ''} onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as QaAuditStatus | undefined }))} className="input">
              <option value="">All statuses</option>
              {QA_AUDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <TargetFilters value={filters} onChange={(next) => setFilters({ ...next, status: filters.status })} />
        </form>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load audits.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !audits ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : audits.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardCheck className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">{filtered ? 'No audits match these filters' : 'No audits yet'}</p>
          <p className="mt-1 text-sm text-muted">{filtered ? 'Clear a filter to see more.' : 'Schedule the first one above.'}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {audits.map((a) => (
            <Link key={a.id} to={`/qa-audits/${a.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:shadow-md">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{a.targetDepartmentName} · {a.scheduledDate}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-muted">{a.findingsRecorded} / {a.totalItems} findings</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[a.status] ?? ''}`}>{STATUS_LABELS[a.status] ?? a.status}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

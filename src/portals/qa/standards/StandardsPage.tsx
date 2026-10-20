import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { QA_STANDARD_CATEGORIES, type QaStandardCategory } from '@/types'
import { useCreateStandard, useQaStandards, useSetStandardActive } from './standardsApi'

const CATEGORY_LABELS: Record<QaStandardCategory, string> = {
  GOVERNANCE: 'Governance',
  ACADEMIC_PROGRAMS: 'Academic Programs',
  STAFF: 'Staff',
  STUDENTS: 'Students',
  FACILITIES: 'Facilities',
  FINANCE: 'Finance',
  RESEARCH: 'Research',
  COMMUNITY_ENGAGEMENT: 'Community Engagement',
}

/**
 * The standards catalog an audit is assessed against. No delete: a standard
 * already used by a checklist item (and in turn by findings) must keep its
 * meaning for every past audit, so it is deactivated instead.
 */
export function StandardsPage() {
  const { data: standards, isPending, error, refetch } = useQaStandards()
  const create = useCreateStandard()
  const setActive = useSetStandardActive()
  const [form, setForm] = useState({ code: '', category: 'GOVERNANCE' as QaStandardCategory, title: '', description: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.title.trim()) return
    create.mutate(
      { code: form.code.trim(), category: form.category, title: form.title.trim(), description: form.description.trim() || undefined },
      { onSuccess: () => setForm({ code: '', category: 'GOVERNANCE', title: '', description: '' }) },
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">The catalog every checklist item and audit finding is measured against.</p>

      <Card className="p-5">
        <h2 className="font-semibold text-ink">Add a standard</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Code
            <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="STD-GOV-02" className="input" required />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            Category
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as QaStandardCategory }))} className="input">
              {QA_STANDARD_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Title
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" required />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Description (optional)
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input min-h-20" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending} disabled={!form.code.trim() || !form.title.trim()}>Add standard</Button>
            {create.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(create.error)}</p>}
          </div>
        </form>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load the standards catalog.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !standards ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : standards.length === 0 ? (
        <Card className="p-10 text-center">
          <ShieldCheck className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No standards yet</p>
          <p className="mt-1 text-sm text-muted">Add the first one above.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {standards.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{s.code}</span>
                  <span className="text-xs text-muted">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                  {!s.isActive && <span className="rounded-md bg-line px-2 py-0.5 text-xs font-semibold text-muted">Inactive</span>}
                </div>
                <p className="mt-1 font-medium text-ink">{s.title}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActive.mutate({ id: s.id, isActive: !s.isActive })}
                loading={setActive.isPending && setActive.variables?.id === s.id}
              >
                {s.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

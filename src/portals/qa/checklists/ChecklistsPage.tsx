import { ListChecks } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useChecklistTemplates, useCreateChecklistTemplate } from './checklistsApi'

/**
 * Checklist templates: a named, ordered list of items an audit is run
 * against. Items are managed on the template's own detail page.
 */
export function ChecklistsPage() {
  const { data: templates, isPending, error, refetch } = useChecklistTemplates()
  const create = useCreateChecklistTemplate()
  const [form, setForm] = useState({ name: '', description: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    create.mutate({ name: form.name.trim(), description: form.description.trim() || undefined }, { onSuccess: () => setForm({ name: '', description: '' }) })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="max-w-2xl text-sm text-muted">Reusable checklists an audit is run against. Add items from the standards catalog on each template's own page.</p>

      <Card className="p-5">
        <h2 className="font-semibold text-ink">New checklist template</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Name
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Description (optional)
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input min-h-20" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending} disabled={!form.name.trim()}>Create template</Button>
            {create.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(create.error)}</p>}
          </div>
        </form>
      </Card>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load checklist templates.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !templates ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : templates.length === 0 ? (
        <Card className="p-10 text-center">
          <ListChecks className="mx-auto size-8 text-muted" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No checklist templates yet</p>
          <p className="mt-1 text-sm text-muted">Create the first one above.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Link key={t.id} to={`/qa-checklists/${t.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 p-4 transition hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{t.name}</p>
                    {!t.isActive && <span className="rounded-md bg-line px-2 py-0.5 text-xs font-semibold text-muted">Inactive</span>}
                  </div>
                  {t.description && <p className="mt-0.5 truncate text-sm text-muted">{t.description}</p>}
                </div>
                <span className="shrink-0 text-sm text-muted">{t.itemCount} item{t.itemCount === 1 ? '' : 's'}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

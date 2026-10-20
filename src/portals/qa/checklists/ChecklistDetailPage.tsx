import { ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useQaStandards } from '../standards/standardsApi'
import { useChecklistTemplate, useCreateChecklistItem, useDeleteChecklistItem, useSetTemplateActive } from './checklistsApi'

/** One template's items, each mapped to a standard, in audit order. */
export function ChecklistDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const { data: template, isPending, error, refetch } = useChecklistTemplate(templateId)
  const { data: standards } = useQaStandards()
  const setActive = useSetTemplateActive()
  const createItem = useCreateChecklistItem(templateId ?? '')
  const deleteItem = useDeleteChecklistItem(templateId ?? '')
  const [form, setForm] = useState({ standardId: '', prompt: '', guidance: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.standardId || !form.prompt.trim()) return
    createItem.mutate(
      { standardId: form.standardId, prompt: form.prompt.trim(), guidance: form.guidance.trim() || undefined },
      { onSuccess: () => setForm({ standardId: '', prompt: '', guidance: '' }) },
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/qa-checklists" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Checklist templates
      </Link>

      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load this checklist template.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !template ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div>
              <h2 className="font-semibold text-ink">{template.name}</h2>
              {template.description && <p className="mt-1 text-sm text-muted">{template.description}</p>}
            </div>
            <Button type="button" variant="secondary" onClick={() => setActive.mutate({ id: template.id, isActive: !template.isActive })} loading={setActive.isPending}>
              {template.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-ink">Add an item</h3>
            <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
                Standard
                <select value={form.standardId} onChange={(e) => setForm((f) => ({ ...f, standardId: e.target.value }))} className="input" required>
                  <option value="">Choose a standard…</option>
                  {(standards ?? []).filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.title}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
                Prompt
                <textarea value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} className="input min-h-16" required />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold text-ink sm:col-span-2">
                Guidance (optional)
                <textarea value={form.guidance} onChange={(e) => setForm((f) => ({ ...f, guidance: e.target.value }))} className="input min-h-16" />
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" loading={createItem.isPending} disabled={!form.standardId || !form.prompt.trim()}>Add item</Button>
                {createItem.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(createItem.error)}</p>}
              </div>
            </form>
          </Card>

          {template.items.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-semibold text-ink">No items yet</p>
              <p className="mt-1 text-sm text-muted">Add the first one above.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {template.items.map((item) => (
                <Card key={item.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink ring-1 ring-inset ring-brand-ink/15">{item.standardCode}</span>
                    <p className="mt-1.5 font-medium text-ink">{item.prompt}</p>
                    {item.guidance && <p className="mt-0.5 text-sm text-muted">{item.guidance}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteItem.mutate(item.id)}
                    disabled={deleteItem.isPending}
                    aria-label={`Remove ${item.prompt}`}
                    className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </Card>
              ))}
              {deleteItem.error && <p role="alert" className="text-sm text-danger">{errorMessage(deleteItem.error)}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

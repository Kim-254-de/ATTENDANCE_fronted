import { useState } from 'react'
import { Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime, formatShortDate } from '@/lib/format'
import { Badge, FileUpload, Head, Notice, type Tone } from './parts'
import { useRemoveStaffId, useStaffIdUploads, useStaffIds, useUndoStaffIdUpload, useUploadStaffIds } from './smartttApi'

/**
 * The approved staff-ID list: a lecturer can only create a SMARTTT account
 * (and so sign in to attendance) with a staff ID on it. Removing an ID
 * disables the lecturer account registered with it.
 */
export function StaffIdsPage() {
  const ids = useStaffIds()
  const uploads = useStaffIdUploads()
  const send = useUploadStaffIds()
  const remove = useRemoveStaffId()
  const undo = useUndoStaffIdUpload()
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  const done = { onSuccess: (r: { detail?: string }) => setNotice({ tone: 'success', text: r.detail ?? 'Done.' }), onError: (e: unknown) => setNotice({ tone: 'error', text: errorMessage(e) }) }
  const term = search.trim().toLowerCase()
  const shown = (ids.data ?? []).filter((s) => !term || s.staff_id.toLowerCase().includes(term) || (s.name_hint ?? '').toLowerCase().includes(term))

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold text-navy-900">Upload staff IDs</h2>
        <p className="mt-1 text-sm text-muted">A CSV with a staff ID per row (and optionally the name). IDs already on the list are skipped.</p>
        <div className="mt-4">
          <FileUpload label="Staff ID file" accept={['.csv']} pending={send.isPending} buttonText="Upload staff IDs"
            onUpload={(file, reset) => { setNotice(null); send.mutate(file, { ...done, onSuccess: (r) => { reset(); done.onSuccess(r) } }) }} />
        </div>
      </Card>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <section className="space-y-3">
        <h2 className="font-semibold text-navy-900">Uploads</h2>
        {uploads.error ? (
          <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(uploads.error, 'Could not load the uploads from SMARTTT.')}</Card>
        ) : uploads.isPending ? (
          <Skeleton className="h-24" />
        ) : uploads.data.uploads.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">No uploads recorded.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <Head columns={['File', 'Added', 'Still listed', 'Claimed', 'Uploaded', '']} />
              <tbody className="divide-y divide-line">
                {uploads.data.uploads.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 font-medium text-navy-900">{u.file_name}</td>
                    <td className="px-5 py-3">{u.ids_created}{u.ids_skipped ? <span className="text-muted"> ({u.ids_skipped} skipped)</span> : null}</td>
                    <td className="px-5 py-3">{u.ids_remaining}</td>
                    <td className="px-5 py-3">{u.ids_claimed}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(u.uploaded_at)}{u.uploaded_by ? ` · ${u.uploaded_by}` : ''}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" aria-label={`Undo the upload ${u.file_name}`} loading={undo.isPending && undo.variables === u.id}
                        onClick={() => {
                          if (window.confirm(`Remove every staff ID ${u.file_name} added? Lecturer accounts registered with them are disabled.`)) undo.mutate(u.id, done)
                        }}>
                        <Undo2 className="size-4" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {uploads.data && uploads.data.untracked_ids > 0 && (
          <p className="text-xs text-muted">{uploads.data.untracked_ids} ID(s) were loaded before uploads were recorded.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold text-navy-900">Staff IDs{ids.data ? ` (${ids.data.length})` : ''}</h2>
          <label className="w-full sm:w-64">
            <span className="sr-only">Search staff IDs</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID or name" className="input" />
          </label>
        </div>
        {ids.error ? (
          <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(ids.error, 'Could not load the staff IDs from SMARTTT.')}</Card>
        ) : ids.isPending ? (
          <Skeleton className="h-40" />
        ) : shown.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">{term ? 'No staff ID matches.' : 'The list is empty.'}</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <Head columns={['Staff ID', 'Name', 'Account', 'Added', '']} />
              <tbody className="divide-y divide-line">
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 font-medium text-navy-900">{s.staff_id}</td>
                    <td className="px-5 py-3 text-muted">{s.name_hint || '—'}</td>
                    <td className="px-5 py-3">{s.is_claimed ? <Badge tone="success">Registered</Badge> : <Badge tone="muted">Not yet</Badge>}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatShortDate(s.uploaded_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" aria-label={`Remove ${s.staff_id}`} loading={remove.isPending && remove.variables === s.id}
                        onClick={() => {
                          const warning = s.is_claimed ? ' The lecturer account registered with it is disabled.' : ''
                          if (window.confirm(`Remove ${s.staff_id} from the list?${warning}`)) remove.mutate(s.id, done)
                        }}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  )
}

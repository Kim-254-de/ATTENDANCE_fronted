import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { SmartttUploadStatus } from '@/types'
import { Badge, FileUpload, Head, Notice, type Tone } from './parts'
import { useDeleteTimetableUpload, useTimetableUploads, useUploadProgress, useUploadTimetable } from './smartttApi'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  done: 'success',
  processed: 'success',
  partial: 'warning',
  failed: 'danger',
}

const fileName = (path?: string | null) => (path ? path.split('/').pop()! : 'Master timetable')

function outcome(batch: SmartttUploadStatus): { tone: Tone; text: string } | null {
  if (batch.status === 'processed' || batch.status === 'partial') {
    return {
      tone: batch.rows_failed > 0 ? 'warning' : 'success',
      text: `Done: ${batch.rows_saved} of ${batch.rows_received} rows saved, ${batch.rows_failed} failed.`,
    }
  }
  if (batch.status === 'failed') {
    return { tone: 'error', text: 'SMARTTT could not read this timetable. Check it is the right document and upload it again.' }
  }
  return null
}

/**
 * The master teaching timetable, uploaded to SMARTTT: it becomes every
 * student's and lecturer's timetable, and the times and rooms attendance
 * lets classes be activated in. SMARTTT reads it in the background.
 */
export function TimetablePage() {
  const uploads = useTimetableUploads()
  const send = useUploadTimetable()
  const remove = useDeleteTimetableUpload()
  const [batchId, setBatchId] = useState<string | null>(null)
  const progress = useUploadProgress(batchId)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  const finished = progress.data ? outcome(progress.data) : null
  const { refetch } = uploads
  useEffect(() => {
    if (finished) void refetch()
  }, [finished, refetch])

  const working = send.isPending || (!!batchId && !finished && !progress.error)
  const shown = finished ?? (progress.error ? { tone: 'error' as const, text: 'The file was uploaded, but its progress could not be followed. Its status is in the history below.' } : notice)

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold text-navy-900">Upload the master timetable</h2>
        <p className="mt-1 text-sm text-muted">The Directorate’s teaching timetable (PDF, Excel, CSV or Word, up to 25 MB). Its term is read from the document.</p>
        <div className="mt-4">
          <FileUpload
            label="Timetable file"
            accept={['.pdf', '.xlsx', '.xls', '.csv', '.docx']}
            pending={working}
            onUpload={(file, reset) => {
              setNotice(null)
              setBatchId(null)
              send.mutate(file, {
                onSuccess: (started) => {
                  reset()
                  const id = started.upload_batch_id ?? started.batch_id
                  if (id) setBatchId(id)
                  else setNotice({ tone: 'success', text: `Done: ${started.rows_saved ?? 0} of ${started.rows_received ?? started.total_rows ?? 0} rows saved.` })
                },
                onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
              })
            }}
          />
        </div>
        <div className="mt-4 space-y-2">
          {working && batchId && (
            <Notice tone="success">
              {progress.data && progress.data.rows_received > 0
                ? `Read ${progress.data.rows_received} rows; saving them to the timetable…`
                : 'Uploaded. SMARTTT is reading the timetable…'}
            </Notice>
          )}
          {shown && <Notice tone={shown.tone}>{shown.text}</Notice>}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold text-navy-900">Upload history</h2>
        {remove.isError && <Notice tone="error">{errorMessage(remove.error)}</Notice>}
        {uploads.error ? (
          <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(uploads.error, 'Could not load the uploads from SMARTTT.')}</Card>
        ) : uploads.isPending ? (
          <Skeleton className="h-40" />
        ) : uploads.data.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No timetable has been uploaded yet.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <Head columns={['File', 'Rows saved', 'Status', 'Uploaded', '']} />
              <tbody className="divide-y divide-line">
                {uploads.data.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy-900">{fileName(u.source_file)}</p>
                      {u.uploaded_by_name && <p className="text-muted">{u.uploaded_by_name}</p>}
                    </td>
                    <td className="px-5 py-3">{u.rows_saved ?? 0} / {u.rows_received ?? u.rows_saved ?? 0}</td>
                    <td className="px-5 py-3"><Badge tone={STATUS_TONE[u.status] ?? 'muted'}>{u.status}</Badge></td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{u.created_at ? formatDateTime(u.created_at) : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        aria-label={`Delete the record of ${fileName(u.source_file)}`}
                        loading={remove.isPending && remove.variables === u.id}
                        onClick={() => {
                          if (window.confirm('Delete this upload record? The timetable slots it created stay.')) remove.mutate(u.id)
                        }}
                      >
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

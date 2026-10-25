import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { SmartttAllocationResult, SmartttAllocationRow } from '@/types'
import { FileUpload, Head, Notice, type Tone } from './parts'
import { useAllocationDocuments, useRemoveAllocation, useUploadAllocation } from './smartttApi'

const describe = (r: SmartttAllocationRow) =>
  [r.unit_code, r.group, r.programme, r.year_semester].filter(Boolean).join(' · ')

/**
 * The departments' course-allocation documents (the Word form), which put a
 * lecturer on each slot of SMARTTT's timetable. Each department's latest
 * document replaces its previous one; where two departments name different
 * lecturers for one class, the slot keeps its lecturer and the clash is listed.
 * Departments using the Timetable Allocator publish there instead; this is the
 * fallback for documents.
 */
export function AllocationPage() {
  const documents = useAllocationDocuments()
  const send = useUploadAllocation()
  const remove = useRemoveAllocation()
  const [dryRun, setDryRun] = useState(false)
  const [result, setResult] = useState<SmartttAllocationResult | null>(null)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold text-navy-900">Upload a department’s allocation</h2>
        <p className="mt-1 text-sm text-muted">The department is read from the document’s letterhead. Uploading again replaces that department’s previous document.</p>
        <div className="mt-4">
          <FileUpload
            label="Allocation document"
            accept={['.docx', '.doc', '.pdf']}
            pending={send.isPending}
            buttonText={dryRun ? 'Preview' : 'Upload allocation'}
            onUpload={(file, reset) => {
              setNotice(null)
              setResult(null)
              send.mutate({ file, dryRun }, {
                onSuccess: (r) => { reset(); setResult(r) },
                onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
              })
            }}
          >
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Preview only: show what would change, without saving
            </label>
          </FileUpload>
        </div>
        {notice && <div className="mt-4"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      </Card>

      {result && <AllocationResult result={result} />}

      <section className="space-y-3">
        <h2 className="font-semibold text-navy-900">Documents on file{documents.data?.academic_year ? ` for ${documents.data.academic_year}` : ''}</h2>
        {remove.isError && <Notice tone="error">{errorMessage(remove.error)}</Notice>}
        {remove.isSuccess && remove.data.detail && <Notice tone="success">{remove.data.detail}</Notice>}
        {documents.error ? (
          <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(documents.error, 'Could not load the allocation documents from SMARTTT.')}</Card>
        ) : documents.isPending ? (
          <Skeleton className="h-32" />
        ) : documents.data.documents.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No department has uploaded an allocation yet.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <Head columns={['Department', 'File', 'Rows', 'Slots set', 'Uploaded', '']} />
              <tbody className="divide-y divide-line">
                {documents.data.documents.map((d) => (
                  <tr key={d.source}>
                    <td className="px-5 py-3 font-medium text-navy-900">{d.source}</td>
                    <td className="px-5 py-3 text-muted">{d.file_name}</td>
                    <td className="px-5 py-3">{d.rows}</td>
                    <td className="px-5 py-3">{d.slots_assigned}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">
                      {formatDateTime(d.uploaded_at)}{d.uploaded_by ? ` · ${d.uploaded_by}` : ''}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        aria-label={`Remove ${d.source}'s allocation`}
                        loading={remove.isPending && remove.variables === d.source}
                        onClick={() => {
                          if (window.confirm(`Remove ${d.source}'s allocation? The lecturers it set are taken off their slots.`)) remove.mutate(d.source)
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

function AllocationResult({ result }: { result: SmartttAllocationResult }) {
  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <Notice tone={result.unmatched > 0 || result.conflict_slots > 0 ? 'warning' : 'success'}>{result.detail}</Notice>
      <p className="text-sm text-navy-900">
        {result.matched} matched, {result.unmatched} not matched, {result.slots_updated} slot(s) updated
        {result.conflict_slots > 0 ? `, ${result.conflict_slots} clash(es) with other departments` : ''}.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Matched</h3>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
            {result.results.length === 0 && <li className="text-muted">None</li>}
            {result.results.map((r, i) => (
              <li key={i}>
                {describe(r)} — {r.lecturer}{r.account_linked ? ' ✓' : ''} ({r.slots_assigned} slot{r.slots_assigned === 1 ? '' : 's'})
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Not matched</h3>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
            {result.not_found.length === 0 && <li className="text-muted">None</li>}
            {result.not_found.map((r, i) => (
              <li key={i}>{describe(r)} — {r.lecturer} <span className="text-muted">({r.reason})</span></li>
            ))}
          </ul>
        </div>
      </div>
      {result.conflicts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Clashes (the slot kept its lecturer)</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {result.conflicts.map((c) => (
              <li key={c.slot_id}>
                {c.unit_code} · {c.program}: {c.candidates.map((x) => `${x.lecturer} (${x.department ?? 'unknown department'})`).join(' vs ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

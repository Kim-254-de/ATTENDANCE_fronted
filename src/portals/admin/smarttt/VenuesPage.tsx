import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { SmartttVenueUpload } from '@/types'
import { Badge, FileUpload, Notice, type Tone } from './parts'
import { useUploadVenues, useVenueSummary } from './smartttApi'

const TEMPLATE =
  'code,name,building,floor,capacity,type,status\nLH1,Lecture Hall 1,Main Block,Ground,120,lecture hall,active\nLAB2,Computer Lab 2,Science Block,1,40,lab,active\n'

function downloadTemplate() {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }))
  link.download = 'venue_capacities_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Venue capacities in SMARTTT. A venue first seen in a timetable upload gets a
 * placeholder capacity until it is confirmed here; lecturers' venue checks and
 * the timetable use the confirmed figure.
 */
export function VenuesPage() {
  const summary = useVenueSummary()
  const send = useUploadVenues()
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [rowErrors, setRowErrors] = useState<NonNullable<SmartttVenueUpload['errors']>>([])

  const current = (send.data?.summary ?? summary.data) || null

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy-900">Upload venue capacities</h2>
            <p className="mt-1 text-sm text-muted">A CSV or Excel file: code, name, building, floor, capacity, type, status.</p>
          </div>
          <Button variant="secondary" onClick={downloadTemplate}><Download className="size-4" aria-hidden /> Template</Button>
        </div>
        <div className="mt-4">
          <FileUpload label="Capacities file" accept={['.csv', '.xlsx']} pending={send.isPending} buttonText="Upload capacities"
            onUpload={(file, reset) => {
              setNotice(null)
              setRowErrors([])
              send.mutate(file, {
                onSuccess: (r) => {
                  reset()
                  const issues = r.errors ?? []
                  setRowErrors(issues)
                  setNotice({ tone: issues.length ? 'warning' : 'success', text: r.detail ?? 'Capacities uploaded.' })
                },
                onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
              })
            }} />
        </div>
        <div className="mt-4 space-y-2">
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          {rowErrors.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
              {rowErrors.map((e, i) => <li key={i}>Row {e.row}{e.code ? ` (${e.code})` : ''}: {e.error}</li>)}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold text-navy-900">Capacities</h2>
        {summary.error && !current ? (
          <p role="alert" className="mt-2 text-sm text-red-700">{errorMessage(summary.error, 'Could not load the venues from SMARTTT.')}</p>
        ) : !current ? (
          <Skeleton className="mt-3 h-16" />
        ) : current.total === 0 ? (
          <p className="mt-2 text-sm text-muted">No venues yet. Upload a capacities file or a master timetable.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p>
              {current.confirmed} of {current.total} venue(s) have a confirmed capacity{' '}
              {current.unconfirmed ? <Badge tone="warning">{current.unconfirmed} missing</Badge> : <Badge tone="success">All set</Badge>}
            </p>
            {current.unconfirmed > 0 && (
              <>
                <p className="text-muted">Still on a placeholder capacity (add these to your file):</p>
                <p className="max-h-40 overflow-y-auto text-navy-900">{current.unconfirmed_codes.join(', ')}</p>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

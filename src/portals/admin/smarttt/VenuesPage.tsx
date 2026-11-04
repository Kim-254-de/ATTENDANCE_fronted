import { useState, type FormEvent } from 'react'
import { Download, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { SmartttVenue, SmartttVenueInput, SmartttVenueStatus, SmartttVenueType, SmartttVenueUpload } from '@/types'
import { Badge, FileUpload, Notice, type Tone } from './parts'
import { useDuplicateVenues, useMergeDuplicateVenues, useMergeVenues, useSaveVenue, useUploadVenues, useVenues, useVenueSummary } from './smartttApi'

const TEMPLATE =
  'code,name,building,floor,capacity,type,status\nLH1,Lecture Hall 1,Main Block,Ground,120,lecture hall,active\nLAB2,Computer Lab 2,Science Block,1,40,lab,active\n'

function downloadTemplate() {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }))
  link.download = 'venue_capacities_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const TYPES: Record<SmartttVenueType, string> = { lecture_hall: 'Lecture hall', lab: 'Lab', seminar: 'Seminar room' }
const STATUSES: Record<SmartttVenueStatus, string> = { active: 'Active', maintenance: 'Under maintenance', closed: 'Closed', unavailable: 'Unavailable' }
const BLANK: SmartttVenueInput = { code: '', name: '', building: '', capacity: 50, room_type: 'lecture_hall', status: 'active', for_exams: true, health_unit: false }
const input = 'mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm'

function VenueForm({ venue, onClose }: { venue: SmartttVenue | null; onClose: () => void }) {
  const save = useSaveVenue()
  const [form, setForm] = useState<SmartttVenueInput>(venue ?? BLANK)
  const set = (patch: Partial<SmartttVenueInput>) => setForm({ ...form, ...patch })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const code = form.code.trim()
    save.mutate(
      { id: venue?.id, body: { code, name: form.name.trim() || code, building: form.building.trim(), capacity: form.capacity, room_type: form.room_type, status: form.status, for_exams: form.for_exams, health_unit: form.health_unit } },
      { onSuccess: onClose },
    )
  }
  return (
    <form onSubmit={submit} aria-label={venue ? `Edit ${venue.code}` : 'Add a venue'} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-4 text-sm">
      <h3 className="font-semibold text-navy-900">{venue ? `Edit ${venue.code}` : 'Add a venue'}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>Code<input required maxLength={30} value={form.code} onChange={(e) => set({ code: e.target.value })} className={input} /></label>
        <label>Name<input maxLength={255} value={form.name} placeholder="Same as the code" onChange={(e) => set({ name: e.target.value })} className={input} /></label>
        <label>Building<input required maxLength={255} value={form.building} onChange={(e) => set({ building: e.target.value })} className={input} /></label>
        <label>Capacity<input required type="number" min={1} max={5000} value={form.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} className={input} /></label>
        <label>Type
          <select value={form.room_type} onChange={(e) => set({ room_type: e.target.value as SmartttVenueType })} className={input}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Status
          <select value={form.status} onChange={(e) => set({ status: e.target.value as SmartttVenueStatus })} className={input}>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.for_exams} onChange={(e) => set({ for_exams: e.target.checked })} /> Used for exams</label>
      </div>
      {save.isError && <p role="alert" className="text-red-700">{errorMessage(save.error)}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={save.isPending}>Save</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

/** One room under several codes ("TC1", "TC 1"): what merging would do, and the button that does it. */
function DuplicateVenues() {
  const groups = useDuplicateVenues()
  const merge = useMergeDuplicateVenues()
  const list = groups.data ?? []
  if (merge.isSuccess && list.length === 0) {
    return <Notice tone="success">Merged. Each room is now one venue; generate the exam timetable again so it uses them.</Notice>
  }
  if (list.length === 0) return null
  return (
    <Card className="border-orange-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">{list.length} room{list.length === 1 ? ' is' : 's are'} listed under more than one code</h2>
          <p className="mt-1 text-sm text-muted">
            An upload and a capacities file can name one room differently. Merging keeps one venue and moves its timetable
            slots and exam seats there. If any copy is marked not for exams, the room stays out of exams.
          </p>
        </div>
        <Button loading={merge.isPending} onClick={() => { if (window.confirm(`Merge ${list.length} room(s)? This can't be undone.`)) merge.mutate() }}>
          Merge duplicates
        </Button>
      </div>
      {merge.isError && <Notice tone="error">{errorMessage(merge.error)}</Notice>}
      <div className="mt-3 max-h-64 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr><th className="px-2 py-1">Keep</th><th className="px-2 py-1">Merge into it</th><th className="px-2 py-1">Capacity</th><th className="px-2 py-1">Exams</th></tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.keep.id} className="border-t border-slate-100">
                <td className="px-2 py-1 font-medium text-navy-900">{g.keep.code}</td>
                <td className="px-2 py-1">{g.merge.map((r) => `${r.code} (${r.capacity})`).join(', ')}</td>
                <td className="px-2 py-1">{g.result.capacity}{!g.result.capacity_confirmed && <> <Badge tone="warning">Placeholder</Badge></>}</td>
                <td className="px-2 py-1">{g.result.for_exams ? 'Used' : 'Not used'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Venues the administrator knows are one room though their codes don't say so ("Conference Hall", "ED 4"). */
function MergeInto({ venue, venues, onDone }: { venue: SmartttVenue; venues: SmartttVenue[]; onDone: () => void }) {
  const merge = useMergeVenues()
  const [other, setOther] = useState('')
  const name = venues.find((v) => v.id === other)?.code
  return (
    <div className="mt-3 rounded-lg border border-slate-200 p-4 text-sm">
      <label className="block">Merge another venue into {venue.code}
        <select value={other} onChange={(e) => setOther(e.target.value)} className={input}>
          <option value="">Choose the same room under another name</option>
          {venues.filter((v) => v.id !== venue.id).map((v) => <option key={v.id} value={v.id}>{v.code}{v.name !== v.code ? ` (${v.name})` : ''}</option>)}
        </select>
      </label>
      {merge.isError && <p role="alert" className="mt-2 text-red-700">{errorMessage(merge.error)}</p>}
      <Button type="button" variant="secondary" className="mt-2" disabled={!other} loading={merge.isPending}
        onClick={() => { if (window.confirm(`Merge ${name} into ${venue.code}? ${name} goes away, and its timetable slots move to ${venue.code}. This can't be undone.`)) merge.mutate({ keep: venue.id, merge: [other] }, { onSuccess: onDone }) }}>
        Merge into {venue.code}
      </Button>
    </div>
  )
}

function VenueTable() {
  const venues = useVenues()
  const save = useSaveVenue()
  const [editing, setEditing] = useState<SmartttVenue | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = (venues.data ?? []).filter((v) => !q || `${v.code} ${v.name} ${v.building}`.toLowerCase().includes(q))
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Venues</h2>
          <p className="mt-1 text-sm text-muted">
            Add or change a venue here, without a file. The Director can overrule “Used for exams” for the exam timetable.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden /> Add a venue</Button>
      </div>
      {editing && <VenueForm key={editing === 'new' ? 'new' : editing.id} venue={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <MergeInto key={`merge-${editing.id}`} venue={editing} venues={venues.data ?? []} onDone={() => setEditing(null)} />}
      {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
      {venues.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage(venues.error, 'Could not load the venues from SMARTTT.')}</p>
      ) : venues.isPending ? (
        <Skeleton className="mt-3 h-24" />
      ) : (
        <>
          <input type="search" aria-label="Find a venue" placeholder="Find a venue" value={query} onChange={(e) => setQuery(e.target.value)}
            className="mt-3 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="mt-3 max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-muted">
                <tr>
                  <th className="px-2 py-2">Code</th><th className="px-2 py-2">Building</th><th className="px-2 py-2">Capacity</th>
                  <th className="px-2 py-2">Status</th><th className="px-2 py-2">Used for exams</th><th className="px-2 py-2"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-medium text-navy-900">{v.code}</td>
                    <td className="px-2 py-2">{v.building}</td>
                    <td className="px-2 py-2">{v.capacity}{!v.capacity_confirmed && <> <Badge tone="warning">Placeholder</Badge></>}</td>
                    <td className="px-2 py-2">{STATUSES[v.status]}</td>
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={v.for_exams} aria-label={`${v.code} used for exams`} disabled={save.isPending}
                        onChange={(e) => save.mutate({ id: v.id, body: { for_exams: e.target.checked } })} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button type="button" onClick={() => setEditing(v)} aria-label={`Edit ${v.code}`} className="text-brand"><Pencil className="size-4" aria-hidden /></button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-muted">No venues to show.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
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
      <DuplicateVenues />
      <VenueTable />
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

import clsx from 'clsx'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { BulkPaste, type BulkColumn } from './BulkPaste'
import {
  splitTyped,
  useBulk,
  useDeleteLecturer,
  useSaveLecturer,
  type Board,
  type BoardLecturer,
  type LecturerInput,
  type TeachingLecturer,
} from './teachingApi'
import { Dialog, Field, TableCard, dangerLink, linkButton, td, th } from './ui'

const LECTURER_COLUMNS: BulkColumn[] = [
  { key: 'name', label: 'Name', example: 'Dr. Jane Otieno (FT)', required: true },
  { key: 'staff_number', label: 'Staff number', example: 'TUN/STF/0123', required: true,
    hint: 'How the timetable knows the lecturer, here and on any other department\'s list.' },
  { key: 'phone', label: 'Phone', example: '07…' },
  { key: 'email', label: 'Email', example: 'jane@tharaka.ac.ke' },
  { key: 'max_hours', label: 'Max hours', example: '18', hint: 'Weekly teaching hours. Leave blank for no limit.' },
]

const loadText = (x: BoardLecturer) => `${x.weeklyHours} h/week${x.maxWeeklyHours ? ` of ${x.maxWeeklyHours}` : ''}`

/**
 * The lecturer for a group: type a name to find one on the department's list,
 * or add someone new with their full details (the form prints the phone).
 */
export function LecturerPicker({ lecturers, value, onChange, onAddNew }: {
  lecturers: BoardLecturer[]
  value: string
  onChange: (id: string) => void
  onAddNew: (typed: string) => void
}) {
  const [query, setQuery] = useState('')
  const [changing, setChanging] = useState(false)
  const chosen = lecturers.find((x) => x.id === value)
  const typed = query.trim()
  const q = typed.toLowerCase()
  const matches = lecturers.filter((x) => !q || `${x.title} ${x.fullName} ${x.staffNumber ?? ''} ${x.phone}`.toLowerCase().includes(q))
  const exact = lecturers.some((x) => x.fullName.toLowerCase() === splitTyped(typed).fullName.toLowerCase())

  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium text-ink">Lecturer</p>
      {chosen && !changing ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-brand-soft px-3 py-2">
          <div>
            <p className="font-medium text-ink">{chosen.display}</p>
            <p className="text-xs text-muted">{chosen.phone || 'No phone number yet'} · {loadText(chosen)}</p>
          </div>
          <div className="space-x-3 whitespace-nowrap">
            <button type="button" onClick={() => { setQuery(''); setChanging(true) }} className={linkButton}>Change</button>
            <button type="button" onClick={() => onChange('')} className={dangerLink}>Remove</button>
          </div>
        </div>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type the lecturer's name" aria-label="Lecturer" className="input" />
          <ul className="max-h-52 overflow-y-auto rounded-xl border border-line">
            {matches.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => { onChange(x.id); setChanging(false) }} className="flex w-full cursor-pointer justify-between gap-3 px-3 py-2 text-left hover:bg-brand-soft">
                  <span>{x.display}</span>
                  <span className="text-xs text-muted">{x.phone} · {loadText(x)}</span>
                </button>
              </li>
            ))}
            {typed && !exact && (
              <li>
                <button type="button" onClick={() => onAddNew(typed)} className="w-full cursor-pointer px-3 py-2 text-left font-semibold text-brand-ink hover:bg-brand-soft">
                  + Add “{typed}” as a new lecturer
                </button>
              </li>
            )}
            {!typed && matches.length === 0 && <li className="px-3 py-2 text-muted">No lecturers on your list yet. Type a name to add one.</li>}
          </ul>
          {chosen && <button type="button" onClick={() => setChanging(false)} className="text-xs text-muted">Keep {chosen.display}</button>}
        </>
      )}
    </div>
  )
}

/** The department's own lecturer list. Not per term, so it stays editable while the teaching is published. */
export function LecturersTab({ term, board }: { term: string | undefined; board: Board }) {
  const [editing, setEditing] = useState<BoardLecturer | 'new' | null>(null)
  const [pasting, setPasting] = useState(false)
  const remove = useDeleteLecturer(term)
  const bulk = useBulk(term, 'lecturers')

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => setPasting(true)}>Paste from Excel</Button>
        <Button onClick={() => setEditing('new')}>Add a lecturer</Button>
      </div>
      {remove.isError && <p role="alert" className="text-sm text-danger">{errorMessage(remove.error)}</p>}
      <TableCard>
        <thead className="bg-surface">
          <tr>
            <th className={th}>Name</th><th className={th}>Staff no.</th><th className={th}>FT/PT</th><th className={th}>Phone</th>
            <th className={th}>Email</th><th className={th}>Groups</th><th className={th} title="Across every department they teach for">Hours / week</th>
            <th className={th}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {board.lecturers.map((x) => (
            <tr key={x.id} className={clsx('border-t border-line', !x.active && 'text-muted')}>
              <td className={`${td} font-medium`}>{x.title} {x.fullName}{!x.active && ' (inactive)'}</td>
              <td className={td}>{x.staffNumber || <span className="text-warning">Missing</span>}</td>
              <td className={td}>{x.employmentType === 'part_time' ? 'PT' : 'FT'}</td>
              <td className={td}>{x.phone || <span className="text-warning">Missing</span>}</td>
              <td className={td}>{x.email}</td>
              <td className={td}>{x.groups}</td>
              <td className={clsx(td, x.maxWeeklyHours && x.weeklyHours > x.maxWeeklyHours && 'font-semibold text-danger')}>
                {x.weeklyHours}{x.maxWeeklyHours ? ` / ${x.maxWeeklyHours}` : ''}
              </td>
              <td className={`${td} space-x-3 text-right whitespace-nowrap`}>
                <button onClick={() => setEditing(x)} className={linkButton}>Edit</button>
                <button onClick={() => { if (window.confirm(`Remove ${x.fullName}?`)) remove.mutate(x.id) }} className={dangerLink}>Remove</button>
              </td>
            </tr>
          ))}
          {board.lecturers.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">No lecturers on the list yet. Add them here, then give them groups on the Units tab.</td></tr>
          )}
        </tbody>
      </TableCard>
      {editing && <LecturerForm term={term} lecturer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      {pasting && (
        <BulkPaste title="Paste lecturers" columns={LECTURER_COLUMNS} templateName="lecturers.csv" submit={(rows) => bulk.mutateAsync(rows)} onClose={() => setPasting(false)} />
      )}
    </section>
  )
}

export function LecturerForm({ term, lecturer, typed, onClose, onSaved }: {
  term: string | undefined
  lecturer: BoardLecturer | null
  typed?: string
  onClose: () => void
  onSaved: (saved: TeachingLecturer) => void
}) {
  const save = useSaveLecturer(term)
  const start = typed ? splitTyped(typed) : null
  const [form, setForm] = useState<LecturerInput>({
    title: lecturer?.title ?? start?.title ?? 'Dr.',
    fullName: lecturer?.fullName ?? start?.fullName ?? '',
    staffNumber: lecturer?.staffNumber ?? '',
    employmentType: lecturer?.employmentType ?? start?.employmentType ?? 'full_time',
    phone: lecturer?.phone ?? '',
    email: lecturer?.email ?? '',
    maxWeeklyHours: lecturer?.maxWeeklyHours ?? null,
    active: lecturer?.active ?? true,
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: lecturer?.id, body: { ...form, staffNumber: form.staffNumber?.trim() || null } }, { onSuccess: onSaved })
  }
  return (
    <Dialog title={lecturer ? `Edit ${lecturer.fullName}` : 'Add a lecturer'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
          <div className="col-span-3">
            <Field label="Full name"><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" /></Field>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Staff number" hint="How the timetable, SMARTTT and attendance know them, and another department's list too.">
            <input required value={form.staffNumber ?? ''} onChange={(e) => setForm({ ...form, staffNumber: e.target.value })} placeholder="TUN/STF/0123" className="input" />
          </Field>
          <Field label="Full or part time">
            <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value as LecturerInput['employmentType'] })} className="input">
              <option value="full_time">Full time (FT)</option><option value="part_time">Part time (PT)</option>
            </select>
          </Field>
          <Field label="Phone" hint="Printed on your department's own downloads only.">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07…" className="input" />
          </Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
          <Field label="Max teaching hours a week" hint="Counted across every department. Leave blank for no limit.">
            <input type="number" min={1} max={60} value={form.maxWeeklyHours ?? ''}
              onChange={(e) => setForm({ ...form, maxWeeklyHours: e.target.value === '' ? null : Number(e.target.value) })} className="input" />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
          </label>
        </div>
        {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

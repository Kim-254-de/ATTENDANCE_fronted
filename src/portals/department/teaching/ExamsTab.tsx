import clsx from 'clsx'
import { Download, Send, Unlock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { BulkPaste, type BulkColumn } from './BulkPaste'
import {
  letterUrl,
  useDeletePaper,
  useDeletePractical,
  useExamBoard,
  useExamBulk,
  useNoWrittenExam,
  usePapersFromUnits,
  usePublishExams,
  useSavePaper,
  useSavePractical,
  type ExamBoard,
  type ExamPaper,
  type PaperInput,
  type Practical,
  type PracticalInput,
} from './examsApi'
import { Dialog, Field, TableCard, dangerLink, linkButton, td, th } from './ui'

const PAPER_COLUMNS: BulkColumn[] = [
  { key: 'codes', label: 'Codes', example: 'BITE 131/COSC 130', required: true,
    hint: 'One code, or several units sitting one shared paper, separated by "/".' },
  { key: 'title', label: 'Title', example: 'Introduction to Programming' },
  { key: 'sitting', label: 'Sitting', example: 'Regular',
    hint: 'ODEL: sat by the units\' ODEL and part-time classes, a separate paper. "MATH 241 odel" in Codes works too.' },
  { key: 'written_exam', label: 'Written exam', example: 'Yes', hint: 'No: the units have no written exam this term.' },
  { key: 'examiner', label: 'Examiner', example: 'Dr. Jane Otieno', hint: 'Blank: the unit\'s lecturer.' },
  { key: 'staff_no', label: 'Staff no.', example: 'TUN/STF/0123' },
  { key: 'notes', label: 'Notes', example: '' },
]

const PRACTICAL_COLUMNS: BulkColumn[] = [
  { key: 'unit_code', label: 'Unit code', example: 'COSC 200', required: true },
  { key: 'date', label: 'Date', example: '2026-11-20', required: true },
  { key: 'start', label: 'Start', example: '09:00', required: true },
  { key: 'end', label: 'End', example: '11:00', required: true },
]

/**
 * The department's written exam papers (built from its units, a shared paper
 * carrying several codes), its practicals, and the moderation letter. An
 * officer publishes the paper list to the Director, apart from the teaching.
 */
export function ExamsTab({ term }: { term: string | undefined }) {
  const board = useExamBoard(term)
  const publish = usePublishExams(term)
  const fromUnits = usePapersFromUnits(term)
  const remove = useDeletePaper(term)
  const noExam = useNoWrittenExam(term)
  const bulk = useExamBulk(term, 'exam-papers')
  const [editing, setEditing] = useState<ExamPaper | 'new' | null>(null)
  const [pasting, setPasting] = useState(false)
  const [letter, setLetter] = useState(false)

  if (board.isPending) return <Skeleton className="h-40" />
  if (board.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(board.error)}</p>
  const data = board.data
  const editable = data.canEdit
  // A unit is examined once per sitting its classes need: regular, and ODEL when it has ODEL or part-time classes.
  const unexamined = data.units.filter((u) => !u.paperId || (u.sittings.includes('odel') && !u.odelPaperId))
  const failure = publish.error ?? fromUnits.error ?? remove.error ?? noExam.error

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {data.summary.papers} papers · {data.summary.students} student entries
          {data.published && data.publication && ` · published to the Director on ${new Date(data.publication.publishedAt).toLocaleDateString()}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setLetter(true)} disabled={data.papers.length === 0}>
            <Download className="size-4" aria-hidden /> Moderation letter
          </Button>
          {editable && <Button variant="secondary" onClick={() => setPasting(true)}>Paste from Excel</Button>}
          {editable && unexamined.some((u) => !u.noWrittenExam) && (
            <Button variant="secondary" onClick={() => fromUnits.mutate()} loading={fromUnits.isPending}>A paper for each unit</Button>
          )}
          {editable && <Button onClick={() => setEditing('new')}>Add a paper</Button>}
          {data.published ? (
            <Button variant="secondary" onClick={() => publish.mutate('reopen')} loading={publish.isPending}>
              <Unlock className="size-4" aria-hidden /> Reopen papers
            </Button>
          ) : (
            <Button onClick={() => publish.mutate('publish')} loading={publish.isPending} disabled={data.problems.length > 0}
              title={data.problems.length ? 'Fix the items listed first' : undefined}>
              <Send className="size-4" aria-hidden /> Publish papers
            </Button>
          )}
        </div>
      </div>
      {failure && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage(failure)}</p>}
      {!data.published && data.problems.length > 0 && (
        <details className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" open={data.problems.length <= 5}>
          <summary className="cursor-pointer font-semibold">{data.problems.length} to finish before publishing the papers</summary>
          <ul className="mt-1 list-disc pl-5">{data.problems.map((p, i) => <li key={`${p.code}${i}`}>{p.message}</li>)}</ul>
        </details>
      )}

      <TableCard>
        <thead className="bg-surface">
          <tr><th className={th}>Codes</th><th className={th}>Title</th><th className={th}>Class rows</th><th className={th}>Students</th><th className={th}>Examiner</th><th className={th}><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {data.papers.map((p) => (
            <tr key={p.id} className="border-t border-line align-top">
              <td className={`${td} font-semibold whitespace-nowrap text-ink`}>
                {p.codes}
                {p.sitting === 'odel' && <span className="ml-1 rounded-md bg-brand-soft px-1.5 text-xs font-normal text-brand-ink">ODEL</span>}
                {p.changedSincePublished && <span className="ml-1 rounded-md bg-warning-soft px-1.5 text-xs font-normal text-warning">changed</span>}
              </td>
              <td className={td}>{p.title}{p.notes && <span className="block text-xs text-muted">{p.notes}</span>}</td>
              <td className={`${td} text-xs text-muted`}>{p.classRows.join(', ')}</td>
              <td className={td}>{p.students}</td>
              <td className={td}>{p.examiner ?? <span className="text-warning">None</span>}</td>
              <td className={`${td} space-x-3 text-right whitespace-nowrap`}>
                {editable && <button onClick={() => setEditing(p)} className={linkButton}>Edit</button>}
                {editable && <button onClick={() => { if (window.confirm(`Remove ${p.codes}?`)) remove.mutate(p.id) }} className={dangerLink}>Remove</button>}
              </td>
            </tr>
          ))}
          {data.papers.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No papers yet. Start with “A paper for each unit”, then join shared papers.</td></tr>
          )}
        </tbody>
      </TableCard>

      {unexamined.length > 0 && (
        <Card className="space-y-2 p-4 text-sm">
          <p className="font-semibold text-ink">Units on no paper</p>
          <ul className="space-y-1">
            {unexamined.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className={clsx(u.noWrittenExam && 'text-muted')}>
                  {u.code} {u.title}
                  {u.paperId && !u.odelPaperId && <span className="ml-1 text-xs text-warning">needs an ODEL paper</span>}
                </span>
                {editable && (
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={u.noWrittenExam} onChange={(e) => noExam.mutate({ unitId: u.id, value: e.target.checked })} />
                    No written exam
                  </label>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Practicals term={term} board={data} />

      {editing && <PaperForm term={term} board={data} paper={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {pasting && <BulkPaste title="Paste exam papers" columns={PAPER_COLUMNS} templateName="exam-papers.csv" submit={(rows) => bulk.mutateAsync(rows)} onClose={() => setPasting(false)} />}
      {letter && <LetterForm term={term} onClose={() => setLetter(false)} />}
    </section>
  )
}

function PaperForm({ term, board, paper, onClose }: { term: string | undefined; board: ExamBoard; paper: ExamPaper | null; onClose: () => void }) {
  const save = useSavePaper(term)
  const [form, setForm] = useState<PaperInput>({
    unitIds: paper?.units.map((u) => u.id) ?? [],
    title: paper?.title ?? '',
    sitting: paper?.sitting ?? 'regular',
    examinerId: paper?.examinerId ?? null,
    notes: paper?.notes ?? '',
  })
  const [query, setQuery] = useState('')
  const chosen = new Set(form.unitIds)
  const toggle = (id: string) => setForm({ ...form, unitIds: chosen.has(id) ? form.unitIds.filter((u) => u !== id) : [...form.unitIds, id] })
  // Units this paper may take: on no paper of its sitting yet, or already on this one.
  const own = board.units.filter((u) => {
    if (u.noWrittenExam) return false
    const taken = form.sitting === 'odel' ? u.odelPaperId : u.paperId
    return !taken || taken === paper?.id
  })
  const q = query.trim().toLowerCase()
  const others = [
    ...(paper?.units.filter((u) => u.departmentCode !== board.department.code).map((u) => ({ ...u, title: '' })) ?? []),
    ...board.otherUnits.filter((u) => q && `${u.code} ${u.title} ${u.departmentCode}`.toLowerCase().includes(q)),
  ]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: paper?.id, body: { ...form, examinerId: form.examinerId || null } }, { onSuccess: onClose })
  }

  return (
    <Dialog title={paper ? `Edit ${paper.codes}` : 'Add a paper'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <fieldset className="space-y-2">
          <legend className="font-medium text-ink">Units sitting this paper</legend>
          <p className="text-xs text-muted">Tick several for a shared paper (e.g. BITE 131/COSC 130). All groups of a unit sit one paper.</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {own.map((u) => (
              <label key={u.id} className="flex items-center gap-2">
                <input type="checkbox" checked={chosen.has(u.id)} onChange={() => toggle(u.id)} /> {u.code} <span className="text-xs text-muted">{u.title}</span>
              </label>
            ))}
          </div>
          <p className="pt-2 font-medium text-ink">Another department's unit on the same paper</p>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search their units, e.g. BITE" aria-label="Search other departments' units" className="input" />
          <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
            {others.map((u) => (
              <label key={u.id} className="flex items-center gap-2">
                <input type="checkbox" checked={chosen.has(u.id)} onChange={() => toggle(u.id)} /> {u.code} <span className="text-xs text-muted">{u.departmentCode}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Sitting" hint="ODEL and part-time classes sit separate papers.">
          <select value={form.sitting} onChange={(e) => setForm({ ...form, sitting: e.target.value as PaperInput['sitting'], unitIds: [] })} className="input">
            <option value="regular">Regular classes</option>
            <option value="odel">ODEL and part-time classes</option>
          </select>
        </Field>
        <Field label="Title" hint="Blank: the first unit's title.">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
        </Field>
        <Field label="Examiner" hint="Blank: the unit's lecturer.">
          <select value={form.examinerId ?? ''} onChange={(e) => setForm({ ...form, examinerId: e.target.value || null })} className="input">
            <option value="">The unit's lecturer</option>
            {board.lecturers.filter((x) => x.active || x.id === form.examinerId).map((x) => <option key={x.id} value={x.id}>{x.display}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <input value={form.notes} maxLength={500} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
        </Field>
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending} disabled={form.unitIds.length === 0}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

function Practicals({ term, board }: { term: string | undefined; board: ExamBoard }) {
  const [editing, setEditing] = useState<Practical | 'new' | null>(null)
  const [pasting, setPasting] = useState(false)
  const remove = useDeletePractical(term)
  const bulk = useExamBulk(term, 'practicals')
  const editable = board.canEdit
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">Practicals</h3>
        {editable && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPasting(true)}>Paste from Excel</Button>
            <Button variant="secondary" onClick={() => setEditing('new')} disabled={board.units.length === 0}>Add a practical</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted">On dates you set; the exam timetable shows them but doesn't move them.</p>
      {remove.isError && <p role="alert" className="text-sm text-danger">{errorMessage(remove.error)}</p>}
      <TableCard>
        <thead className="bg-surface">
          <tr><th className={th}>Unit</th><th className={th}>Date</th><th className={th}>Time</th><th className={th}><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {board.practicals.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className={td}>{p.unitCode} {p.unitTitle}</td>
              <td className={td}>{new Date(`${p.date}T00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
              <td className={td}>{p.startTime}–{p.endTime}</td>
              <td className={`${td} space-x-3 text-right whitespace-nowrap`}>
                {editable && <button onClick={() => setEditing(p)} className={linkButton}>Edit</button>}
                {editable && <button onClick={() => remove.mutate(p.id)} className={dangerLink}>Remove</button>}
              </td>
            </tr>
          ))}
          {board.practicals.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">No practicals.</td></tr>}
        </tbody>
      </TableCard>
      {editing && <PracticalForm term={term} board={board} practical={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {pasting && <BulkPaste title="Paste practicals" columns={PRACTICAL_COLUMNS} templateName="practicals.csv" submit={(rows) => bulk.mutateAsync(rows)} onClose={() => setPasting(false)} />}
    </div>
  )
}

function PracticalForm({ term, board, practical, onClose }: { term: string | undefined; board: ExamBoard; practical: Practical | null; onClose: () => void }) {
  const save = useSavePractical(term)
  const [form, setForm] = useState<PracticalInput>({
    unitId: practical?.unitId ?? board.units[0]?.id ?? '',
    date: practical?.date ?? '',
    startTime: practical?.startTime ?? '09:00',
    endTime: practical?.endTime ?? '11:00',
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: practical?.id, body: form }, { onSuccess: onClose })
  }
  return (
    <Dialog title={practical ? 'Edit the practical' : 'Add a practical'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <Field label="Unit">
          <select required value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="input">
            {board.units.map((u) => <option key={u.id} value={u.id}>{u.code} {u.title}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date"><input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" /></Field>
          <Field label="Start"><input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input" /></Field>
          <Field label="End"><input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input" /></Field>
        </div>
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

function LetterForm({ term, onClose }: { term: string | undefined; onClose: () => void }) {
  const [moderator, setModerator] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
  return (
    <Dialog title="Moderation letter" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <Field label="External moderator" hint="Name, then the address, one line each.">
          <textarea rows={4} value={moderator} onChange={(e) => setModerator(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-normal text-ink"
            placeholder={'Prof. A. Moderator\nDepartment of Computing\nP.O. Box 123, Nairobi'} />
        </Field>
        <Field label="Date"><input value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          {(['docx', 'pdf'] as const).map((format) => (
            <a key={format} href={letterUrl(format, term, moderator, date)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong">
              <Download className="size-4" aria-hidden /> {format === 'docx' ? 'Word' : 'PDF'}
            </a>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

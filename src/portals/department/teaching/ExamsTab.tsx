import { Download, FileUp, Hash, RefreshCw, Send, Trash2, Unlock, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { BulkPaste, type BulkColumn } from './BulkPaste'
import { ClassNumbers, ExamListUpload, NumbersAtOnce, PaperRows } from './ExamListUpload'
import {
  editedRows,
  guessedRow,
  letterUrl,
  rowInputs,
  useDeleteExamList,
  useDeletePaper,
  useDeletePractical,
  useExamBoard,
  useExamBulk,
  usePublishExams,
  useRecount,
  useSavePaper,
  useSavePractical,
  useSetPaperRows,
  type EditedRow,
  type ExamBoard,
  type ExamPaper,
  type PaperInput,
  type Practical,
  type PracticalInput,
  typedCodes,
  useSaveExamList,
} from './examsApi'
import { Dialog } from '@/components/ui/Dialog'
import { useConfirm } from '@/components/ui/useConfirm'
import { Field, TableCard, dangerLink, linkButton, td, th } from './ui'

const PRACTICAL_COLUMNS: BulkColumn[] = [
  { key: 'unit_code', label: 'Unit code', example: 'COSC 200', required: true },
  { key: 'date', label: 'Date', example: '2026-11-20', required: true },
  { key: 'start', label: 'Start', example: '09:00', required: true },
  { key: 'end', label: 'End', example: '11:00', required: true },
]

/**
 * The department's written exam papers: the units on its uploaded moderation
 * letters and no others. Its practicals, too. An officer publishes the paper
 * list to the Director, apart from the teaching.
 */
export function ExamsTab({ term }: { term: string | undefined }) {
  const board = useExamBoard(term)
  const publish = usePublishExams(term)
  const remove = useDeletePaper(term)
  const recount = useRecount(term)
  const removeList = useDeleteExamList(term)
  const [ask, confirmDialog] = useConfirm()
  const [editing, setEditing] = useState<ExamPaper | null>(null)
  const [uploading, setUploading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [numbers, setNumbers] = useState<ExamPaper | null>(null)
  const [allNumbers, setAllNumbers] = useState(false)
  const [letter, setLetter] = useState(false)
  if (board.isPending) return <Skeleton className="h-40" />
  if (board.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(board.error)}</p>
  const data = board.data
  const editable = data.canEdit
  const failure = publish.error ?? remove.error ?? recount.error ?? removeList.error
  const anyListed = data.papers.some((p) => p.listed)
  const listedCount = data.papers.filter((p) => p.listed).length

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
          {editable && (
            <Button variant={data.papers.length ? 'secondary' : 'primary'} onClick={() => setUploading(true)}>
              <FileUp className="size-4" aria-hidden /> Upload exam list
            </Button>
          )}
          {editable && (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden /> Add a unit
            </Button>
          )}
          {editable && anyListed && (
            <Button variant="secondary" onClick={() => setAllNumbers(true)}>
              <Hash className="size-4" aria-hidden /> Enter student numbers
            </Button>
          )}
          {editable && anyListed && (
            <Button variant="secondary" onClick={() => recount.mutate()} loading={recount.isPending}
              title="Read again the classes on the master timetable and how many students synced each unit in SMARTTT. What you changed stays.">
              <RefreshCw className="size-4" aria-hidden /> Re-count from SMARTTT
            </Button>
          )}
          {editable && anyListed && (
            <Button variant="secondary" loading={removeList.isPending}
              onClick={() => ask({
                title: 'Remove the uploaded exam list?',
                message: `All ${listedCount} papers go, ones you typed in too, with their numbers and invigilators.`,
                confirmLabel: 'Remove list',
                action: () => removeList.mutateAsync(),
                errorFallback: 'Could not remove the exam list.',
              })}
              title="Remove every paper on your list, uploaded or typed in, to upload it again or start over">
              <Trash2 className="size-4" aria-hidden /> Remove uploaded list
            </Button>
          )}
          {data.published ? (
            <Button variant="secondary" onClick={() => publish.mutate('reopen')} loading={publish.isPending}>
              <Unlock className="size-4" aria-hidden /> Reopen papers
            </Button>
          ) : (
            <Button onClick={() => publish.mutate('publish')} loading={publish.isPending} disabled={data.problems.length > 0}
              title={data.problems[0]?.message}>
              <Send className="size-4" aria-hidden /> Publish papers
            </Button>
          )}
        </div>
      </div>
      {failure && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage(failure)}</p>}
      {data.papers.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">
          <p>
            Upload your moderation letter, the Word document you send with your exam drafts, or add its units one by one.
            These are the units on the exam timetable. The classes sitting them come from the SMARTTT master timetable and
            student numbers from who synced each unit.
          </p>
          {editable && <Button onClick={() => setUploading(true)}><FileUp className="size-4" aria-hidden /> Upload exam list</Button>}
        </div>
      )}
      {data.warnings.length > 0 && (
        <details className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-ink" open={data.warnings.length <= 3}>
          <summary className="cursor-pointer font-semibold">
            {data.warnings.length} {data.warnings.length === 1 ? 'paper has' : 'papers have'} no students known yet (doesn't stop publishing)
          </summary>
          <ul className="mt-1 list-disc pl-5">{data.warnings.map((w, i) => <li key={`${w.code}${i}`}>{w.message}</li>)}</ul>
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
              <td className={td}>
                {p.students}
                {p.listed && (
                  <button onClick={() => setNumbers(p)} className={`${linkButton} block text-xs`}>
                    {editable ? 'Numbers' : 'Classes'}
                    {p.rows.some((r) => r.edited) && <span className="sr-only"> (changed here)</span>}
                  </button>
                )}
              </td>
              <td className={td}>{p.examiner ?? <span className={p.listed ? 'text-muted' : 'text-warning'}>None</span>}</td>
              <td className={`${td} space-x-3 text-right whitespace-nowrap`}>
                {editable && <button onClick={() => setEditing(p)} className={linkButton}>Edit</button>}
                {editable && <button onClick={() => ask({
                  title: `Remove ${p.codes}?`,
                  message: "The paper comes off this term's exam list.",
                  confirmLabel: 'Remove paper',
                  action: () => remove.mutateAsync(p.id),
                  errorFallback: 'Could not remove the paper.',
                })} className={dangerLink}>Remove</button>}
              </td>
            </tr>
          ))}
          {data.papers.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">
              No papers yet: upload your moderation letter, or add its units one by one.
            </td></tr>
          )}
        </tbody>
      </TableCard>

      <Practicals term={term} board={data} />

      {editing && <PaperForm term={term} board={data} paper={editing} onClose={() => setEditing(null)} />}
      {letter && <LetterForm term={term} onClose={() => setLetter(false)} />}
      {uploading && <ExamListUpload term={term} onClose={() => setUploading(false)} />}
      {adding && <AddPaper term={term} papers={data.papers} onClose={() => setAdding(false)} />}
      {numbers && <PaperRows term={term} paper={numbers} onClose={() => setNumbers(null)} />}
      {allNumbers && <NumbersAtOnce term={term} papers={data.papers} onClose={() => setAllNumbers(false)} />}
      {confirmDialog}
    </section>
  )
}

const sameCodes = (a: string[]) => a.map((c) => c.replace(/\s+/g, '').toUpperCase()).sort().join('/')

/** One unit typed in, saved like a line of the letter; the form stays open for the next. */
function AddPaper({ term, papers, onClose }: { term: string | undefined; papers: ExamPaper[]; onClose: () => void }) {
  const save = useSaveExamList(term)
  const [codes, setCodes] = useState('')
  const [title, setTitle] = useState('')
  const [sitting, setSitting] = useState<PaperInput['sitting']>('regular')
  const [problem, setProblem] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setAdded(null)
    const parsed = typedCodes(codes)
    if (!parsed) return setProblem('Type a unit code like COSC 130. For a joint paper, separate them with /: COSC 0172/0170.')
    if (!title.trim()) return setProblem('Give the unit a title.')
    const key = sameCodes(parsed)
    if (papers.some((p) => p.sitting === sitting && sameCodes(p.codes.split('/')) === key)) {
      return setProblem(`${parsed.join('/')} is already on your list${sitting === 'odel' ? ' as an ODEL paper' : ''}. Use Edit to change it.`)
    }
    setProblem(null)
    save.mutate([{ codes: parsed, title: title.trim(), sitting }], {
      onSuccess: () => {
        setAdded(parsed.join('/'))
        setCodes('')
        setTitle('')
      },
    })
  }
  return (
    <Dialog title="Add a unit" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <p className="text-muted">
          It goes on the exam timetable like a unit on your moderation letter. Its classes come from the SMARTTT master
          timetable; enter or correct its numbers under Numbers once it is added.
        </p>
        <Field label="Unit code" hint="For a joint paper, separate the codes with /: COSC 0172/0170.">
          <input value={codes} onChange={(e) => setCodes(e.target.value)} className="input" autoFocus />
        </Field>
        <Field label="Title">
          <input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className="input" />
        </Field>
        <Field label="Sitting" hint="ODEL and part-time classes sit separate papers.">
          <select value={sitting} onChange={(e) => setSitting(e.target.value as PaperInput['sitting'])} className="input">
            <option value="regular">Regular classes</option>
            <option value="odel">ODEL and part-time classes</option>
          </select>
        </Field>
        {problem && <p role="alert" className="text-danger">{problem}</p>}
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        {added && <p role="status" className="text-success">{added} added. Type the next one, or close.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <Button type="submit" loading={save.isPending}>Add</Button>
        </div>
      </form>
    </Dialog>
  )
}

function PaperForm({ term, board, paper, onClose }: { term: string | undefined; board: ExamBoard; paper: ExamPaper; onClose: () => void }) {
  const save = useSavePaper(term)
  const saveRows = useSetPaperRows(term)
  // The paper's students are its class rows; one nobody synced starts with a guessed class, so only the number is typed.
  const startRows = paper.rows.length ? editedRows(paper) : [guessedRow(paper)]
  const [rows, setRows] = useState<EditedRow[]>(startRows)
  const [form, setForm] = useState<PaperInput>({
    title: paper.title,
    sitting: paper.sitting,
    examinerId: paper.examinerId,
    notes: paper.notes,
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: paper.id, body: { ...form, examinerId: form.examinerId || null } }, {
      onSuccess: () => {
        // The guessed class left at 0 isn't saved: the paper still has no students known.
        const untouched = paper.rows.length === 0 && rows.length === 1 && rows[0]!.students === 0
        if (untouched || JSON.stringify(rows) === JSON.stringify(startRows)) return onClose()
        saveRows.mutate({ paperId: paper.id, rows: rowInputs(rows) }, { onSuccess: onClose })
      },
    })
  }

  return (
    <Dialog title={`Edit ${paper.codes}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <Field label="Sitting" hint="ODEL and part-time classes sit separate papers.">
          <select value={form.sitting} onChange={(e) => setForm({ ...form, sitting: e.target.value as PaperInput['sitting'] })} className="input">
            <option value="regular">Regular classes</option>
            <option value="odel">ODEL and part-time classes</option>
          </select>
        </Field>
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
        </Field>
        <Field label="Examiner" hint="Optional.">
          <select value={form.examinerId ?? ''} onChange={(e) => setForm({ ...form, examinerId: e.target.value || null })} className="input">
            <option value="">None</option>
            {board.lecturers.filter((x) => x.active || x.id === form.examinerId).map((x) => <option key={x.id} value={x.id}>{x.display}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <input value={form.notes} maxLength={500} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
        </Field>
        <fieldset className="space-y-2">
          <legend className="font-medium text-ink">Number of students</legend>
          <p className="text-xs text-muted">
            {paper.rows.length
              ? 'By class, from the master timetable and who synced the unit in SMARTTT. Correct a number, add a class or remove one; what you set stays when SMARTTT is read again.'
              : 'This unit is not on the master timetable and nobody has synced it. Enter how many sit it; correct the class if it is not the right one.'}
          </p>
          <ClassNumbers rows={rows} onChange={setRows} />
        </fieldset>
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        {saveRows.isError && <p role="alert" className="text-danger">{errorMessage(saveRows.error)}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending || saveRows.isPending}>Save</Button>
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

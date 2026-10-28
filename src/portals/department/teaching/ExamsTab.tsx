import clsx from 'clsx'
import { Download, FileUp, Hash, RefreshCw, Send, Trash2, Unlock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
  useNoWrittenExam,
  usePapersFromUnits,
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
  const recount = useRecount(term)
  const removeList = useDeleteExamList(term)
  const [editing, setEditing] = useState<ExamPaper | 'new' | null>(null)
  const [uploading, setUploading] = useState(false)
  const [numbers, setNumbers] = useState<ExamPaper | null>(null)
  const [allNumbers, setAllNumbers] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [letter, setLetter] = useState(false)
  const [search, setSearch] = useSearchParams()
  // The Units & groups tab is the page's default: dropping `tab` opens it, keeping the term.
  const openUnits = () => {
    const next = new URLSearchParams(search)
    next.delete('tab')
    setSearch(next, { replace: true })
  }

  if (board.isPending) return <Skeleton className="h-40" />
  if (board.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(board.error)}</p>
  const data = board.data
  const editable = data.canEdit
  // A unit is examined once per sitting its classes need: regular, and ODEL when it has ODEL or part-time classes.
  const unexamined = data.units.filter((u) => !u.paperId || (u.sittings.includes('odel') && !u.odelPaperId))
  const failure = publish.error ?? fromUnits.error ?? remove.error ?? noExam.error ?? recount.error ?? removeList.error
  const anyListed = data.papers.some((p) => p.listed)
  const listedCount = data.papers.filter((p) => p.listed).length
  // A paper is built from units, at least one of them this department's: none yet, nothing to put on one.
  const noUnits = data.units.length === 0

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
          {editable && anyListed && (
            <Button variant="secondary" onClick={() => setAllNumbers(true)}>
              <Hash className="size-4" aria-hidden /> Enter student numbers
            </Button>
          )}
          {editable && anyListed && (
            <Button variant="secondary" onClick={() => recount.mutate()} loading={recount.isPending}
              title="Read again how many students synced each unit in SMARTTT. Numbers you changed stay.">
              <RefreshCw className="size-4" aria-hidden /> Re-count from SMARTTT
            </Button>
          )}
          {editable && anyListed && (
            <Button variant="secondary" loading={removeList.isPending}
              onClick={() => { if (window.confirm(`Remove the uploaded exam list: all ${listedCount} papers from it, with their numbers and invigilators? Papers built from your units stay.`)) removeList.mutate() }}
              title="Remove every paper that came from the uploaded exam list, to upload it again or start over">
              <Trash2 className="size-4" aria-hidden /> Remove uploaded list
            </Button>
          )}
          {editable && <Button variant="secondary" onClick={() => setPasting(true)}>Paste from Excel</Button>}
          {editable && unexamined.some((u) => !u.noWrittenExam) && (
            <Button variant="secondary" onClick={() => fromUnits.mutate()} loading={fromUnits.isPending}>A paper for each unit</Button>
          )}
          {editable && (
            <Button onClick={() => setEditing('new')} disabled={noUnits}
              title={noUnits ? 'Enter your units on the Units & groups tab first' : undefined}>Add a paper</Button>
          )}
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
      {noUnits && data.papers.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">
          <p>
            Upload your exam list: the Word document you send for moderation. Student numbers come from who synced
            each unit in SMARTTT. Or build papers from your units on the Units &amp; groups tab.
          </p>
          <div className="flex gap-2">
            {editable && <Button onClick={() => setUploading(true)}><FileUp className="size-4" aria-hidden /> Upload exam list</Button>}
            <Button variant="secondary" onClick={openUnits}>Go to Units &amp; groups</Button>
          </div>
        </div>
      )}
      {!data.published && data.problems.length > 0 && (
        <details className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" open={data.problems.length <= 5}>
          <summary className="cursor-pointer font-semibold">{data.problems.length} to finish before publishing the papers</summary>
          <ul className="mt-1 list-disc pl-5">{data.problems.map((p, i) => <li key={`${p.code}${i}`}>{p.message}</li>)}</ul>
        </details>
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
                {editable && <button onClick={() => { if (window.confirm(`Remove ${p.codes}?`)) remove.mutate(p.id) }} className={dangerLink}>Remove</button>}
              </td>
            </tr>
          ))}
          {data.papers.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">
              {noUnits ? 'No papers yet: upload your exam list.' : 'No papers yet. Upload your exam list, or start with “A paper for each unit”.'}
            </td></tr>
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
      {uploading && <ExamListUpload term={term} onClose={() => setUploading(false)} />}
      {numbers && <PaperRows term={term} paper={numbers} onClose={() => setNumbers(null)} />}
      {allNumbers && <NumbersAtOnce term={term} papers={data.papers} onClose={() => setAllNumbers(false)} />}
    </section>
  )
}

function PaperForm({ term, board, paper, onClose }: { term: string | undefined; board: ExamBoard; paper: ExamPaper | null; onClose: () => void }) {
  const save = useSavePaper(term)
  const saveRows = useSetPaperRows(term)
  // A listed paper's students are its class rows; one nobody synced starts with a guessed class, so only the number is typed.
  const startRows = paper?.listed ? (paper.rows.length ? editedRows(paper) : [guessedRow(paper)]) : []
  const [rows, setRows] = useState<EditedRow[]>(startRows)
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

  // An uploaded paper keeps its codes; only its title, sitting, examiner and notes change here.
  const listed = !!paper?.listed
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const { unitIds, ...rest } = form
    const body = listed ? (rest as PaperInput) : { ...form, unitIds }
    save.mutate({ id: paper?.id, body: { ...body, examinerId: form.examinerId || null } }, {
      onSuccess: () => {
        // The guessed class left at 0 isn't saved: the paper still has no students known.
        const untouched = paper?.rows.length === 0 && rows.length === 1 && rows[0]!.students === 0
        if (!paper || !listed || untouched || JSON.stringify(rows) === JSON.stringify(startRows)) return onClose()
        saveRows.mutate({ paperId: paper.id, rows: rowInputs(rows) }, { onSuccess: onClose })
      },
    })
  }

  return (
    <Dialog title={paper ? `Edit ${paper.codes}` : 'Add a paper'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4 text-sm">
        {!listed && <fieldset className="space-y-2">
          <legend className="font-medium text-ink">Units sitting this paper</legend>
          <p className="text-xs text-muted">Tick several for a shared paper (e.g. BITE 131/COSC 130). All groups of a unit sit one paper.</p>
          {own.length === 0 && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
              {board.units.length === 0
                ? 'Your department has no units yet. Enter them on the Units & groups tab first.'
                : form.sitting === 'odel'
                  ? 'Every one of your units is already on an ODEL paper (or has no written exam).'
                  : 'Every one of your units is already on a paper (or has no written exam). Edit that paper instead.'}
            </p>
          )}
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
        </fieldset>}
        <Field label="Sitting" hint="ODEL and part-time classes sit separate papers.">
          <select value={form.sitting} onChange={(e) => setForm({ ...form, sitting: e.target.value as PaperInput['sitting'], unitIds: listed ? form.unitIds : [] })} className="input">
            <option value="regular">Regular classes</option>
            <option value="odel">ODEL and part-time classes</option>
          </select>
        </Field>
        <Field label="Title" hint="Blank: the first unit's title.">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
        </Field>
        <Field label="Examiner" hint={listed ? 'Optional for an uploaded paper.' : "Blank: the unit's lecturer."}>
          <select value={form.examinerId ?? ''} onChange={(e) => setForm({ ...form, examinerId: e.target.value || null })} className="input">
            <option value="">{listed ? 'None' : "The unit's lecturer"}</option>
            {board.lecturers.filter((x) => x.active || x.id === form.examinerId).map((x) => <option key={x.id} value={x.id}>{x.display}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <input value={form.notes} maxLength={500} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
        </Field>
        {paper && (
          <fieldset className="space-y-2">
            <legend className="font-medium text-ink">Number of students</legend>
            {listed ? (
              <>
                <p className="text-xs text-muted">
                  {paper.rows.length
                    ? 'By class, from who synced the unit in SMARTTT. Correct a number or add a class; your numbers stay when SMARTTT is read again.'
                    : 'Nobody has synced this unit in SMARTTT. Enter how many sit it; correct the class if it is not the right one.'}
                </p>
                <ClassNumbers rows={rows} onChange={setRows} />
              </>
            ) : (
              <p className="text-xs text-muted">
                {paper.students} students, from your units&apos; classes on the Units &amp; groups tab. Change them there.
              </p>
            )}
          </fieldset>
        )}
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        {saveRows.isError && <p role="alert" className="text-danger">{errorMessage(saveRows.error)}</p>}
        <div className="flex items-center justify-end gap-2">
          {!listed && form.unitIds.length === 0 && <span className="mr-auto text-xs text-muted">Tick at least one unit to save.</span>}
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending || saveRows.isPending} disabled={!listed && form.unitIds.length === 0}>Save</Button>
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

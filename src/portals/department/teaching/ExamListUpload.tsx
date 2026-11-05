import clsx from 'clsx'
import { FileUp, Plus, Trash2 } from 'lucide-react'
import { useState, type ClipboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import {
  editedRows,
  guessedRow,
  readExamList,
  rowInputs,
  useSaveExamList,
  useSetManyPaperRows,
  useSetPaperRows,
  type EditedRow,
  type ExamListReview,
  type ExamPaper,
  type LetterClassInput,
  type RowInput,
  type Sitting,
} from './examsApi'
import { Dialog } from '@/components/ui/Dialog'
import { TableCard, dangerLink, td, th } from './ui'

const DOCX = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

interface Draft {
  include: boolean
  codes: string
  title: string
  sitting: Sitting
  /** Turn your regular paper into this ODEL one (when the review offers it), rather than add another paper. */
  switchFrom: boolean
}

interface ClassDraft {
  use: boolean
  programme: string
  year: number
  semester: number
  students: number
}

const splitCodes = (codes: string) => codes.split('/').map((c) => c.trim()).filter(Boolean)

/** The classes the letter's headings give a number for: checked, and matched to SMARTTT's programmes. */
function LetterClasses({ review, classes, set }: { review: ExamListReview; classes: Record<string, ClassDraft>; set: (id: string, patch: Partial<ClassDraft>) => void }) {
  if (review.classes.length === 0) return null
  const unmatched = review.classes.filter((c) => classes[c.id]?.use && !classes[c.id]!.programme.trim()).length
  const num = 'input w-16'
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-ink">Classes named in the letter</h3>
      <p className="text-muted">
        Each number goes on every paper under that class's heading, and replaces what the class had on those papers, a number entered earlier too.
        Other classes keep what they have, and their numbers can be entered after saving.
        {unmatched > 0 && <span className="text-warning"> {unmatched} have no programme yet: choose one, or their numbers won't be saved.</span>}
      </p>
      <datalist id="smarttt-programmes">{review.programmes.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</datalist>
      <TableCard>
        <thead className="bg-surface">
          <tr>
            <th className={th}>Use</th><th className={th}>Class in the letter</th><th className={th}>SMARTTT programme</th>
            <th className={th}>Year</th><th className={th}>Semester</th><th className={th}>Students</th>
          </tr>
        </thead>
        <tbody>
          {review.classes.map((c) => {
            const d = classes[c.id]
            if (!d) return null
            return (
              <tr key={c.id} className="border-t border-line">
                <td className={td}><input type="checkbox" checked={d.use} onChange={(e) => set(c.id, { use: e.target.checked })} aria-label={`Use ${c.name}`} /></td>
                <td className={td} title={c.heading}>{c.name}</td>
                <td className={clsx(td, !d.programme.trim() && 'bg-warning-soft/40')}>
                  <input list="smarttt-programmes" value={d.programme} onChange={(e) => set(c.id, { programme: e.target.value })} placeholder="Programme code" className="input w-36" aria-label={`Programme of ${c.name}`} />
                </td>
                <td className={clsx(td, c.year === null && 'bg-warning-soft/40')}><input type="number" min={1} max={10} value={d.year} onChange={(e) => set(c.id, { year: Number(e.target.value) })} className={num} aria-label={`Year of ${c.name}`} /></td>
                <td className={clsx(td, c.semester === null && 'bg-warning-soft/40')}><input type="number" min={1} max={3} value={d.semester} onChange={(e) => set(c.id, { semester: Number(e.target.value) })} className={num} aria-label={`Semester of ${c.name}`} /></td>
                <td className={td}><input type="number" min={1} max={5000} value={d.students} onChange={(e) => set(c.id, { students: Number(e.target.value) })} className={num} aria-label={`Students of ${c.name}`} /></td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>
      <p className="text-xs text-muted">Highlighted: the letter and the timetable don't say, so check it.</p>
    </div>
  )
}

/**
 * The department's exam list uploaded as the Word letter it sends for
 * moderation: read, shown for review with what needs a look (duplicates,
 * codes SMARTTT doesn't know, codes another department listed, papers with no
 * class), corrected, then saved. Classes come from SMARTTT's master timetable
 * and who synced, and from the letter's headings; numbers from those headings,
 * else who synced.
 */
export function ExamListUpload({ term, onClose }: { term: string | undefined; onClose: () => void }) {
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState<unknown>(null)
  const [review, setReview] = useState<ExamListReview | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [classes, setClasses] = useState<Record<string, ClassDraft>>({})
  const save = useSaveExamList(term)

  const read = async (file: File | undefined) => {
    if (!file) return
    setReading(true)
    setReadError(null)
    try {
      const r = await readExamList(term, file)
      setReview(r)
      setDrafts(r.entries.map((e) => ({ include: e.duplicateOf === null, codes: e.codes.join('/'), title: e.title, sitting: e.sitting, switchFrom: !!e.switchesPaperId })))
      setClasses(Object.fromEntries(r.classes.map((c) => [c.id, { use: true, programme: c.programme, year: c.year ?? 1, semester: c.semester ?? 1, students: c.students }])))
    } catch (error) {
      setReadError(error)
    } finally {
      setReading(false)
    }
  }

  const chosen = drafts.filter((d) => d.include && splitCodes(d.codes).length > 0)
  /** The letter's classes on a line's paper that are in use and have a programme and a number. */
  const classesOf = (d: Draft): LetterClassInput[] => {
    const entry = review?.entries[drafts.indexOf(d)]
    return (entry?.letterClasses ?? []).flatMap((id) => {
      const c = classes[id]
      if (!c?.use || !c.programme.trim() || !(c.students > 0)) return []
      return [{ programme: c.programme.trim(), year: c.year, semester: c.semester, students: c.students }]
    })
  }
  const set = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const submit = () =>
    save.mutate(
      chosen.map((d) => {
        const named = classesOf(d)
        const replaces = review?.entries[drafts.indexOf(d)]?.switchesPaperId
        return {
          codes: splitCodes(d.codes),
          title: d.title.trim(),
          sitting: d.sitting,
          ...(named.length > 0 ? { classes: named } : {}),
          ...(replaces && d.switchFrom && d.sitting === 'odel' ? { replacesPaperId: replaces } : {}),
        }
      }),
      { onSuccess: onClose },
    )

  return (
    <Dialog title="Upload your exam list" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        {!review && (
          <>
            <p className="text-muted">
              Upload the Word document you send for moderation (.docx). Every table row with a unit code becomes a
              paper; rows under an ODEL or part-time heading, written “MATH 241 odel” or titled “… ODEL”, are ODEL papers, and so
              is a unit's second listing. A unit your list has as regular but the letter lists only as ODEL becomes an ODEL paper. The classes
              taking each unit come from the SMARTTT master timetable, so the Director's timetable keeps them from
              clashing. A heading that gives a class's size, like “BSc Nursing Y1S1 (107 students)”, sets that class's number on
              its papers, and uploading again overwrites with the new letter's numbers. Other numbers come from who
              synced each unit, and you can enter or correct them after saving.
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center hover:bg-surface">
              <FileUp className="size-6 text-brand" aria-hidden />
              <span className="font-semibold text-ink">{reading ? 'Reading…' : 'Choose the .docx file'}</span>
              <input type="file" accept={DOCX} className="sr-only" disabled={reading} onChange={(e) => void read(e.target.files?.[0])} />
            </label>
            {readError !== null && <p role="alert" className="text-danger">{errorMessage(readError)}</p>}
          </>
        )}
        {review && (
          <>
            <p className="text-muted">
              {review.summary.papers} papers read
              {review.summary.newPapers < review.summary.papers && `, ${review.summary.papers - review.summary.newPapers} already yours (their titles update)`}.
              {review.summary.secondListings > 0 && ` ${review.summary.secondListings} units listed twice: the second listing is taken as the ODEL paper.`}
              {review.summary.toOdel > 0 && ` ${review.summary.toOdel} of your regular papers become ODEL papers.`}
              {review.summary.duplicates > 0 && ` ${review.summary.duplicates} repeated rows are left out.`}
              {' '}Check the highlighted rows, then save.
            </p>
            {!review.smarttt.available && (
              <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-warning">
                Classes and student numbers couldn't be read from SMARTTT: {review.smarttt.reason} You can still save, and enter or re-count them later.
              </p>
            )}
            <LetterClasses review={review} classes={classes} set={(id, patch) => setClasses({ ...classes, [id]: { ...classes[id]!, ...patch } })} />
            <TableCard>
              <thead className="bg-surface">
                <tr>
                  <th className={th}><span className="sr-only">Include</span></th>
                  <th className={th}>Codes</th><th className={th}>Title</th><th className={th}>Sitting</th>
                  <th className={th}>Students</th><th className={th}>Check</th>
                </tr>
              </thead>
              <tbody>
                {review.entries.map((e, i) => {
                  const d = drafts[i]!
                  const repeated = e.secondListingOf !== null ? review.entries.find((x) => x.line === e.secondListingOf) : undefined
                  const notes = [
                    e.duplicateOf !== null && `Same as line ${e.duplicateOf}`,
                    repeated && `ODEL: second listing of line ${repeated.line}`,
                    repeated && repeated.title.trim().toLowerCase() !== e.title.trim().toLowerCase() &&
                      `Title differs from line ${repeated.line} (“${repeated.title}”): check the code`,
                    e.unknownCodes.length > 0 && `SMARTTT doesn't know ${e.unknownCodes.join(', ')}: check the code`,
                    e.otherDepartments.length > 0 && `Also listed by ${e.otherDepartments.join(', ')}`,
                    e.letterClasses.length === 0 && e.students === 0 && e.classRows.length > 0 && 'On the master timetable, nobody synced yet: enter the numbers after saving',
                    e.letterClasses.length === 0 && e.students === 0 && e.classRows.length === 0 && 'Not on the master timetable and nobody synced: add its classes after saving',
                    e.letterClasses.length > 0 && `Numbers from the letter's ${e.letterClasses.length === 1 ? 'class' : `${e.letterClasses.length} classes`}`,
                    e.existingPaperId && 'Already yours: updates it',
                  ].filter((n): n is string => !!n)
                  const switchable = !!e.switchesPaperId && d.sitting === 'odel'
                  const warn = e.unknownCodes.length > 0 || e.otherDepartments.length > 0 || (e.letterClasses.length === 0 && e.students === 0 && e.classRows.length === 0)
                  return (
                    <tr key={e.line} className={clsx('border-t border-line align-top', !d.include && 'opacity-50', warn && d.include && 'bg-warning-soft/40')}>
                      <td className={td}>
                        <input type="checkbox" checked={d.include} onChange={(x) => set(i, { include: x.target.checked })} aria-label={`Include line ${e.line}`} />
                      </td>
                      <td className={td}>
                        <input value={d.codes} onChange={(x) => set(i, { codes: x.target.value })} className="input w-40" aria-label={`Codes, line ${e.line}`} />
                        {e.section && <span className="mt-0.5 block text-xs text-muted">{e.section}</span>}
                      </td>
                      <td className={td}>
                        <input value={d.title} onChange={(x) => set(i, { title: x.target.value })} className="input min-w-48" aria-label={`Title, line ${e.line}`} />
                      </td>
                      <td className={td}>
                        <select value={d.sitting} onChange={(x) => set(i, { sitting: x.target.value as Sitting })} className="input" aria-label={`Sitting, line ${e.line}`}>
                          <option value="regular">Regular</option>
                          <option value="odel">ODEL</option>
                        </select>
                      </td>
                      <td className={td} title={e.classRows.map((r) => `${r.label}: ${r.students}`).join('\n')}>
                        {e.students ?? '—'}
                        {e.classRows.length > 0 && <span className="block text-xs text-muted">{e.classRows.length} class{e.classRows.length > 1 ? 'es' : ''}</span>}
                      </td>
                      <td className={`${td} text-xs`}>
                        {notes.map((n) => <span key={n} className={clsx('block', /^(Already|Same|Numbers|ODEL)/.test(n) ? 'text-muted' : 'text-warning')}>{n}</span>)}
                        {switchable && (
                          <label className="mt-1 flex items-start gap-1.5 text-ink">
                            <input type="checkbox" checked={d.switchFrom} onChange={(x) => set(i, { switchFrom: x.target.checked })} className="mt-0.5" />
                            <span>
                              Your regular paper becomes this ODEL paper, keeping its examiner and invigilators.
                              {!d.switchFrom && <span className="block text-warning">Unticked: the regular paper stays and a separate ODEL paper is added.</span>}
                            </span>
                          </label>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableCard>
            {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => { setReview(null); setDrafts([]) }} className="mr-auto">Another file</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} loading={save.isPending} disabled={chosen.length === 0}>Save {chosen.length} papers</Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}

/**
 * A listed paper's classes and how many sit each. SMARTTT's count is shown
 * beside each; a class can be added, and one that doesn't sit the paper removed.
 */
export function ClassNumbers({ rows, onChange }: { rows: EditedRow[]; onChange: (rows: EditedRow[]) => void }) {
  const set = (i: number, patch: Partial<RowInput>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const total = rows.reduce((n, r) => n + (Number.isFinite(r.students) ? r.students : 0), 0)
  const num = 'input w-16'
  return (
    <div className="space-y-2">
      <TableCard>
        <thead className="bg-surface">
          <tr>
            <th className={th}>Programme</th><th className={th}>Year</th><th className={th}>Semester</th><th className={th}>Stream</th>
            <th className={th}>Students</th><th className={th}>SMARTTT</th><th className={th}><span className="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              <td className={td}><input value={r.programme} onChange={(e) => set(i, { programme: e.target.value })} disabled={r.smartttStudents !== null} className="input w-32" aria-label="Programme" /></td>
              <td className={td}><input type="number" min={1} max={10} value={r.year} onChange={(e) => set(i, { year: Number(e.target.value) })} disabled={r.smartttStudents !== null} className={num} aria-label="Year" /></td>
              <td className={td}><input type="number" min={1} max={3} value={r.semester} onChange={(e) => set(i, { semester: Number(e.target.value) })} disabled={r.smartttStudents !== null} className={num} aria-label="Semester" /></td>
              <td className={td}><input value={r.stream} onChange={(e) => set(i, { stream: e.target.value })} disabled={r.smartttStudents !== null} className="input w-20" aria-label="Stream" /></td>
              <td className={td}><input type="number" min={0} max={5000} value={r.students} onChange={(e) => set(i, { students: Number(e.target.value) })} className={num} aria-label="Students" /></td>
              <td className={`${td} text-muted`}>{r.smartttStudents ?? 'added'}</td>
              <td className={`${td} text-right`}>
                <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className={dangerLink} aria-label="Remove the class">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">No class yet: it isn't on the master timetable and nobody has synced it. Add the classes that sit it.</td></tr>}
        </tbody>
      </TableCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={() => onChange([...rows, { programme: '', year: 1, semester: 1, stream: '', students: 0, smartttStudents: null }])}>
          <Plus className="size-4" aria-hidden /> Add a class
        </Button>
        <span className="text-muted">{total} students</span>
      </div>
    </div>
  )
}

/**
 * A listed paper's classes and how many students sit it. A number changed
 * from SMARTTT's is kept when SMARTTT is read again.
 */
export function PaperRows({ term, paper, onClose }: { term: string | undefined; paper: ExamPaper; onClose: () => void }) {
  const save = useSetPaperRows(term)
  const [rows, setRows] = useState<EditedRow[]>(editedRows(paper))
  const submit = () => save.mutate({ paperId: paper.id, rows: rowInputs(rows) }, { onSuccess: onClose })
  return (
    <Dialog title={`Students sitting ${paper.codes}${paper.sitting === 'odel' ? ' (ODEL)' : ''}`} onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          The classes taking the unit on the master timetable, with who synced it in SMARTTT. Correct a number, add a
          class, or remove one that doesn't sit this paper; what you set stays when SMARTTT is read again.
        </p>
        <ClassNumbers rows={rows} onChange={setRows} />
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </Dialog>
  )
}

const classLabel = (r: RowInput) => `${r.programme} Y${r.year}S${r.semester}${r.stream ? ` (${r.stream})` : ''}`

/**
 * Every uploaded paper's number on one screen, saved in one go. A paper sat
 * by one class (or nobody yet: a guessed class) takes its number here; one
 * sat by several classes is changed under its Numbers. A column of numbers
 * pasted from Excel fills the boxes downward.
 */
export function NumbersAtOnce({ term, papers, onClose }: { term: string | undefined; papers: ExamPaper[]; onClose: () => void }) {
  const save = useSetManyPaperRows(term)
  const listed = papers.filter((p) => p.listed)
  const [onlyMissing, setOnlyMissing] = useState(listed.some((p) => p.students === 0))
  // Typed numbers by paper id; a paper not typed in keeps its number.
  const [typed, setTyped] = useState<Record<string, string>>({})
  const shown = listed.filter((p) => !onlyMissing || p.students === 0 || p.id in typed)
  const single = (p: ExamPaper) => editedRows(p).length <= 1
  const classOf = (p: ExamPaper): EditedRow => editedRows(p)[0] ?? guessedRow(p)
  const editableIds = shown.filter(single).map((p) => p.id)

  const paste = (paperId: string, e: ClipboardEvent<HTMLInputElement>) => {
    const values = e.clipboardData.getData('text').split(/\r?\n/).map((v) => v.trim()).filter((v, i, all) => v !== '' || i < all.length - 1)
    if (values.length < 2) return
    e.preventDefault()
    const from = editableIds.indexOf(paperId)
    const next = { ...typed }
    values.forEach((v, i) => {
      const id = editableIds[from + i]
      if (id && /^\d*$/.test(v)) next[id] = v
    })
    setTyped(next)
  }

  const changes = listed
    .filter((p) => p.id in typed && typed[p.id] !== '' && Number(typed[p.id]) !== p.students)
    .map((p) => {
      const row = classOf(p)
      const others = editedRows(p).filter((r) => r !== row && classLabel(r) !== classLabel(row))
      return { paperId: p.id, rows: rowInputs([{ ...row, students: Number(typed[p.id]) }, ...others]) }
    })
  const submit = () => save.mutate(changes, { onSuccess: onClose })

  return (
    <Dialog title="Enter student numbers" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          Type how many students sit each paper, or paste a column of numbers from Excel into the first box: it fills
          the boxes below it in order. A paper sat by several classes is changed under its Numbers. A guessed class comes
          from the paper's code: it only helps spread the papers, so correct it under Numbers to keep that class's
          papers from clashing.
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Only papers with no students yet
        </label>
        <TableCard>
          <thead className="bg-surface">
            <tr><th className={th}>Codes</th><th className={th}>Title</th><th className={th}>Class</th><th className={th}>Students</th></tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const row = classOf(p)
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className={`${td} font-semibold whitespace-nowrap text-ink`}>
                    {p.codes}
                    {p.sitting === 'odel' && <span className="ml-1 rounded-md bg-brand-soft px-1.5 text-xs font-normal text-brand-ink">ODEL</span>}
                  </td>
                  <td className={td}>{p.title}</td>
                  <td className={`${td} text-xs text-muted`}>{single(p) ? <>{classLabel(row)}{row.smartttStudents === null && classLabel(row) === classLabel(guessedRow(p)) && ' (guessed)'}</> : `${p.classRows.length} classes`}</td>
                  <td className={td}>
                    {single(p) ? (
                      <input type="number" min={0} max={5000} inputMode="numeric" className="input w-20"
                        aria-label={`Students sitting ${p.codes}${p.sitting === 'odel' ? ' (ODEL)' : ''}`}
                        value={typed[p.id] ?? String(p.students)}
                        onChange={(e) => setTyped({ ...typed, [p.id]: e.target.value })}
                        onPaste={(e) => paste(p.id, e)} />
                    ) : (
                      <span>{p.students} <span className="text-xs text-muted">(under Numbers)</span></span>
                    )}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">Every uploaded paper has its students.</td></tr>}
          </tbody>
        </TableCard>
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending} disabled={changes.length === 0}>
            Save {changes.length || ''} {changes.length === 1 ? 'number' : 'numbers'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

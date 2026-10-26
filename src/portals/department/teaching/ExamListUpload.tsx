import clsx from 'clsx'
import { FileUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import {
  readExamList,
  useSaveExamList,
  useSetPaperRows,
  type ExamListReview,
  type ExamPaper,
  type RowInput,
  type Sitting,
} from './examsApi'
import { Dialog, TableCard, dangerLink, td, th } from './ui'

const DOCX = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

interface Draft {
  include: boolean
  codes: string
  title: string
  sitting: Sitting
}

const splitCodes = (codes: string) => codes.split('/').map((c) => c.trim()).filter(Boolean)

/**
 * The department's exam list uploaded as the Word letter it sends for
 * moderation: read, shown for review with what needs a look (duplicates,
 * codes SMARTTT doesn't know, codes another department listed, papers nobody
 * synced), corrected, then saved. Students come from SMARTTT.
 */
export function ExamListUpload({ term, onClose }: { term: string | undefined; onClose: () => void }) {
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState<unknown>(null)
  const [review, setReview] = useState<ExamListReview | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const save = useSaveExamList(term)

  const read = async (file: File | undefined) => {
    if (!file) return
    setReading(true)
    setReadError(null)
    try {
      const r = await readExamList(term, file)
      setReview(r)
      setDrafts(r.entries.map((e) => ({ include: e.duplicateOf === null, codes: e.codes.join('/'), title: e.title, sitting: e.sitting })))
    } catch (error) {
      setReadError(error)
    } finally {
      setReading(false)
    }
  }

  const chosen = drafts.filter((d) => d.include && splitCodes(d.codes).length > 0)
  const set = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const submit = () =>
    save.mutate(chosen.map((d) => ({ codes: splitCodes(d.codes), title: d.title.trim(), sitting: d.sitting })), { onSuccess: onClose })

  return (
    <Dialog title="Upload your exam list" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        {!review && (
          <>
            <p className="text-muted">
              Upload the Word document you send for moderation (.docx). Every table row with a unit code becomes a
              paper; rows under an ODEL or part-time heading, or written “MATH 241 odel”, are ODEL papers. Student
              numbers come from the students who synced each unit in SMARTTT, and you can correct them after saving.
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
              {review.summary.duplicates > 0 && ` ${review.summary.duplicates} repeated rows are left out.`}
              {' '}Check the highlighted rows, then save.
            </p>
            {!review.smarttt.available && (
              <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-warning">
                Student numbers couldn't be read from SMARTTT: {review.smarttt.reason} You can still save, and enter or re-count them later.
              </p>
            )}
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
                  const notes = [
                    e.duplicateOf !== null && `Same as line ${e.duplicateOf}`,
                    e.unknownCodes.length > 0 && `SMARTTT doesn't know ${e.unknownCodes.join(', ')}: check the code`,
                    e.otherDepartments.length > 0 && `Also listed by ${e.otherDepartments.join(', ')}`,
                    e.students === 0 && 'Nobody has synced it: enter the number after saving',
                    e.existingPaperId && 'Already yours: updates it',
                  ].filter((n): n is string => !!n)
                  const warn = e.unknownCodes.length > 0 || e.otherDepartments.length > 0 || e.students === 0
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
                        {notes.map((n) => <span key={n} className={clsx('block', /^(Already|Same)/.test(n) ? 'text-muted' : 'text-warning')}>{n}</span>)}
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
 * A listed paper's classes and how many students sit it. SMARTTT's count is
 * shown beside each; a number changed from it is kept when SMARTTT is read
 * again. A class SMARTTT doesn't have can be added.
 */
export function PaperRows({ term, paper, onClose }: { term: string | undefined; paper: ExamPaper; onClose: () => void }) {
  const save = useSetPaperRows(term)
  const [rows, setRows] = useState<Array<RowInput & { smartttStudents: number | null }>>(
    paper.rows.map(({ programme, year, semester, stream, students, smartttStudents }) => ({ programme, year, semester, stream, students, smartttStudents })),
  )
  const set = (i: number, patch: Partial<RowInput>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const total = rows.reduce((n, r) => n + (Number.isFinite(r.students) ? r.students : 0), 0)
  const submit = () =>
    save.mutate(
      { paperId: paper.id, rows: rows.filter((r) => r.programme.trim()).map(({ programme, year, semester, stream, students }) => ({ programme, year, semester, stream, students })) },
      { onSuccess: onClose },
    )
  const num = 'input w-16'
  return (
    <Dialog title={`Students sitting ${paper.codes}${paper.sitting === 'odel' ? ' (ODEL)' : ''}`} onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          From the students who synced the unit in SMARTTT. Correct a number, or add a class whose students haven't
          synced yet; your numbers stay when SMARTTT is read again. Set a class to 0 if it doesn't sit this paper.
        </p>
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
                  {r.smartttStudents === null && (
                    <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className={dangerLink} aria-label="Remove the class">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">No class yet: nobody has synced this unit. Add the classes that sit it.</td></tr>}
          </tbody>
        </TableCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="secondary" onClick={() => setRows([...rows, { programme: '', year: 1, semester: 1, stream: '', students: 0, smartttStudents: null }])}>
            <Plus className="size-4" aria-hidden /> Add a class
          </Button>
          <span className="text-muted">{total} students</span>
        </div>
        {save.isError && <p role="alert" className="text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </Dialog>
  )
}

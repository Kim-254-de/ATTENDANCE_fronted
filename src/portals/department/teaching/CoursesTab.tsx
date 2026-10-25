import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { BulkPaste, type BulkColumn } from './BulkPaste'
import { COURSE_MODES, useBulk, useDeleteCourse, useSaveCourse, type Board, type CourseInput, type CourseMode } from './teachingApi'
import { Dialog, Field, TableCard, dangerLink, linkButton, td, th } from './ui'

const COURSE_COLUMNS: BulkColumn[] = [
  { key: 'programme', label: 'Programme', example: 'BSC.COMP SCI', required: true },
  { key: 'year', label: 'Year', example: '1', required: true },
  { key: 'semester', label: 'Semester', example: '1', required: true },
  { key: 'sub_class', label: 'Sub-class', example: '', hint: 'Only when a year is taught as separate classes (A, B…).' },
  { key: 'students', label: 'Students', example: '120', required: true },
  { key: 'mode', label: 'Mode', example: 'Regular', hint: 'Regular, ODEL, Weekend, Evening, School-based or Part-time. ODEL students sit exams in a room of their own.' },
]

type OwnCourse = Board['courses'][number]

/**
 * The department's courses (each becomes a class row on the timetable), and
 * every other department's, read-only, to choose for units this department services.
 */
export function CoursesTab({ term, board }: { term: string | undefined; board: Board }) {
  const [editing, setEditing] = useState<OwnCourse | 'new' | null>(null)
  const [pasting, setPasting] = useState(false)
  const [query, setQuery] = useState('')
  const remove = useDeleteCourse(term)
  const bulk = useBulk(term, 'courses')
  const editable = board.canEdit
  const q = query.trim().toLowerCase()
  const others = board.otherCourses.filter((c) => !q || `${c.label} ${c.departmentCode}`.toLowerCase().includes(q))

  return (
    <section className="space-y-3">
      {editable && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setPasting(true)}>Paste from Excel</Button>
          <Button onClick={() => setEditing('new')}>Add a course</Button>
        </div>
      )}
      {remove.isError && <p role="alert" className="text-sm text-danger">{errorMessage(remove.error)}</p>}
      <TableCard>
        <thead className="bg-surface">
          <tr><th className={th}>Course</th><th className={th}>Students</th><th className={th}>Mode</th><th className={th}>Units taking it</th><th className={th}><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {board.courses.map((c) => (
            <tr key={c.id} className="border-t border-line">
              <td className={`${td} font-medium text-ink`}>{c.label}</td>
              <td className={td}>{c.students}</td>
              <td className={td}>{COURSE_MODES[c.mode]}</td>
              <td className={`${td} text-xs text-muted`}>{c.usedBy.join(', ') || 'None yet'}</td>
              <td className={`${td} space-x-3 text-right whitespace-nowrap`}>
                {editable && <button onClick={() => setEditing(c)} className={linkButton}>Edit</button>}
                {editable && <button onClick={() => { if (window.confirm(`Remove ${c.label}?`)) remove.mutate(c.id) }} className={dangerLink}>Remove</button>}
              </td>
            </tr>
          ))}
          {board.courses.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">No courses yet. Add each programme, year and semester you teach this term, with its number of students.</td></tr>
          )}
        </tbody>
      </TableCard>

      <Card className="p-0">
        <details>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">Other departments' courses ({board.otherCourses.length})</summary>
          <div className="space-y-2 border-t border-line p-4">
            <p className="text-xs text-muted">For units you teach to another department's students: choose their course on the unit. Only that department can change it.</p>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses or departments" aria-label="Search other departments' courses" className="input" />
            <ul className="max-h-64 overflow-y-auto text-sm">
              {others.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
                  <span>{c.label}</span><span className="text-xs text-muted">{c.departmentCode} · {c.students} students</span>
                </li>
              ))}
              {others.length === 0 && <li className="py-1 text-muted">None.</li>}
            </ul>
          </div>
        </details>
      </Card>

      {editing && <CourseForm term={term} course={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {pasting && (
        <BulkPaste title="Paste courses" columns={COURSE_COLUMNS} templateName="courses.csv" submit={(rows) => bulk.mutateAsync(rows)} onClose={() => setPasting(false)} />
      )}
    </section>
  )
}

function CourseForm({ term, course, onClose }: { term: string | undefined; course: OwnCourse | null; onClose: () => void }) {
  const save = useSaveCourse(term)
  const [form, setForm] = useState<CourseInput>({
    programme: course?.programme ?? '',
    year: course?.year ?? 1,
    semester: course?.semester ?? 1,
    subClass: course?.subClass ?? '',
    students: course?.students ?? 0,
    mode: course?.mode ?? 'regular',
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: course?.id, body: form }, { onSuccess: onClose })
  }
  return (
    <Dialog title={course ? `Edit ${course.label}` : 'Add a course'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Programme" hint="As printed on the timetable, e.g. BSC.COMP SCI">
          <input required value={form.programme} onChange={(e) => setForm({ ...form, programme: e.target.value })} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Year">
            <input required type="number" min={1} max={7} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Semester">
            <input required type="number" min={1} max={3} value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Sub-class">
            <input value={form.subClass} maxLength={10} onChange={(e) => setForm({ ...form, subClass: e.target.value })} placeholder="A" className="input" />
          </Field>
          <Field label="Students">
            <input required type="number" min={1} max={5000} value={form.students || ''} onChange={(e) => setForm({ ...form, students: Number(e.target.value) })} className="input" />
          </Field>
        </div>
        <Field label="Mode" hint="ODEL students sit their exams in a room of their own.">
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as CourseMode })} className="input">
            {Object.entries(COURSE_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

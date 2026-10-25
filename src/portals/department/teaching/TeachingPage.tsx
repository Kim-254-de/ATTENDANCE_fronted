import clsx from 'clsx'
import { Download, Send, Unlock } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { CoursesTab } from './CoursesTab'
import { ExamsTab } from './ExamsTab'
import { InvigilatorsTab } from './InvigilatorsTab'
import { LecturersTab } from './LecturersTab'
import { exportUrl, meetingText, useBoard, usePublish, type Board } from './teachingApi'
import { TableCard, td, th } from './ui'
import { UnitsTab } from './UnitsTab'

const TABS = ['units', 'courses', 'lecturers', 'times', 'exams', 'invigilators'] as const
type Tab = (typeof TABS)[number]
const LABELS: Record<Tab, string> = { units: 'Units & groups', courses: 'Courses', lecturers: 'Lecturers', times: 'Times', exams: 'Exams', invigilators: 'Invigilators' }

/**
 * What the department teaches in a term of the Timetable Generator: its
 * courses, units and groups (each with a lecturer), and its lecturers. An
 * officer publishes it to the Director, who gives every class a day, time
 * and room; those then show on the Times tab and on the downloads.
 */
export function TeachingPage() {
  const [search, setSearch] = useSearchParams()
  const term = search.get('term') || undefined
  const tab: Tab = (TABS as readonly string[]).includes(search.get('tab') ?? '') ? (search.get('tab') as Tab) : 'units'
  const board = useBoard(term)
  const publish = usePublish(term)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearch(next, { replace: true })
  }

  if (board.isPending) {
    return <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
  }
  if (board.isError) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5" role="alert">
        <p className="text-sm text-danger">{errorMessage(board.error, 'Could not load your teaching.')}</p>
        <button onClick={() => board.refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
      </Card>
    )
  }
  const data = board.data
  // Exam papers and invigilators publish on their own tabs; the header acts on the teaching.
  const teachingTab = tab !== 'exams' && tab !== 'invigilators'
  // Exams and invigilators load on their own tab; no count until then.
  const counts: Partial<Record<Tab, number>> = { units: data.units.length, courses: data.courses.length, lecturers: data.lecturers.length, times: data.summary.groups }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            {data.summary.units} units · {data.summary.withLecturer} of {data.summary.groups} groups with a lecturer
          </p>
          <label className="flex items-center gap-2 text-sm text-ink">
            <span className="font-medium">Term</span>
            <select value={term ?? data.term.id} onChange={(e) => setParam('term', e.target.value === data.terms[0]?.id ? null : e.target.value)} className="input w-auto">
              {data.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {teachingTab && ([['pdf', 'PDF'], ['docx', 'Word'], ['xlsx', 'Excel']] as const).map(([format, label]) => (
            <a key={format} href={exportUrl(format, term)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-card px-4 text-sm font-semibold text-ink hover:bg-surface">
              <Download className="size-4" aria-hidden /> {label}
            </a>
          ))}
          {!teachingTab ? null : data.published ? (
            <Button variant="secondary" onClick={() => publish.mutate('reopen')} loading={publish.isPending}>
              <Unlock className="size-4" aria-hidden /> Reopen
            </Button>
          ) : (
            <Button onClick={() => publish.mutate('publish')} loading={publish.isPending} disabled={data.problems.length > 0}
              title={data.problems.length > 0 ? 'Fix the items listed first' : undefined}>
              <Send className="size-4" aria-hidden /> Publish to the Director
            </Button>
          )}
        </div>
      </div>

      {teachingTab && <Status board={data} />}
      {teachingTab && publish.isError && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage(publish.error)}</p>}
      {teachingTab && !data.published && data.problems.length > 0 && (
        <details className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" open={data.problems.length <= 5}>
          <summary className="cursor-pointer font-semibold">
            {data.problems.length} {data.problems.length === 1 ? 'thing' : 'things'} to finish before publishing
          </summary>
          <ul className="mt-1 list-disc pl-5">
            {data.problems.map((p, i) => <li key={`${p.code}${i}`}>{p.message}</li>)}
          </ul>
        </details>
      )}

      <div role="tablist" aria-label="Teaching" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setParam('tab', t === 'units' ? null : t)}
            className={clsx('cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition', tab === t ? 'bg-brand text-white' : 'bg-card text-ink ring-1 ring-line hover:bg-surface')}>
            {LABELS[t]}{counts[t] === undefined ? '' : ` (${counts[t]})`}
          </button>
        ))}
      </div>

      {tab === 'units' && <UnitsTab term={term} board={data} />}
      {tab === 'courses' && <CoursesTab term={term} board={data} />}
      {tab === 'lecturers' && <LecturersTab term={term} board={data} />}
      {tab === 'times' && <TimesTab board={data} />}
      {tab === 'exams' && <ExamsTab term={term} />}
      {tab === 'invigilators' && <InvigilatorsTab term={term} />}
    </div>
  )
}

function Status({ board }: { board: Board }) {
  const p = board.publication
  if (board.published && p) {
    return (
      <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
        Published to the Director by {p.publishedBy} on {new Date(p.publishedAt).toLocaleString()}. Reopen it to make changes.
      </p>
    )
  }
  if (p?.reopenedAt) {
    return (
      <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
        Reopened by {p.reopenedBy} on {new Date(p.reopenedAt).toLocaleString()}. The Director still has the list published
        on {new Date(p.publishedAt).toLocaleDateString()}
        {board.summary.changed > 0 ? `; ${board.summary.changed} units changed since.` : '.'} Publish again when done.
      </p>
    )
  }
  return null
}

/** When and where each group meets, once the Director has published the timetable. */
function TimesTab({ board }: { board: Board }) {
  if (board.times.error) return <p role="alert" className="text-sm text-danger">{board.times.error}</p>
  if (board.times.publishedVersion == null) {
    return <Card className="p-6 text-sm text-muted">The Director hasn't published the timetable yet. Each group's day, time and room will show here.</Card>
  }
  const rows = board.units.flatMap((u) => u.groups.map((g) => ({ unit: u, group: g })))
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">From version {board.times.publishedVersion} of the timetable.</p>
      <TableCard>
        <thead className="bg-surface">
          <tr><th className={th}>Class</th><th className={th}>Lecturer</th><th className={th}>Day, time &amp; room</th></tr>
        </thead>
        <tbody>
          {rows.map(({ unit, group }) => (
            <tr key={group.id} className="border-t border-line align-top">
              <td className={`${td} font-medium whitespace-nowrap`}>{unit.code} {group.label}</td>
              <td className={td}>{group.lecturer ?? '—'}</td>
              <td className={td}>
                {group.meetings.length
                  ? group.meetings.map((m) => <div key={`${m.dayOfWeek}${m.startTime}`}>{meetingText(m)}</div>)
                  : <span className="text-warning">Not in the published timetable</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  )
}

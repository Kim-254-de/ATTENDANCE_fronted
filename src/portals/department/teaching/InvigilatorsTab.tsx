import clsx from 'clsx'
import { Send, Unlock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useInvigilationBoard, usePublishInvigilators, useSetInvigilator, type InvigilationBoard, type InvigilationRow } from './examsApi'
import { TableCard, td, th } from './ui'

const when = (p: InvigilationRow) =>
  p.date
    ? `${new Date(`${p.date}T00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ${p.startTime}–${p.endTime}`
    : 'Not timetabled yet'

/**
 * Invigilators for the department's papers. Each paper's main invigilator
 * (in its main room; collects every room's scripts) can be named any time,
 * before the Director generates the timetable too, which then keeps their
 * papers apart. Once the Director shares the draft, each extra room of a
 * paper split over rooms gets its own invigilator, and the list can be
 * published. Anyone on any department's list can be named; one person is
 * never in two places in a session.
 */
export function InvigilatorsTab({ term }: { term: string | undefined }) {
  const board = useInvigilationBoard(term)
  const publish = usePublishInvigilators(term)

  if (board.isPending) return <Skeleton className="h-40" />
  if (board.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(board.error)}</p>
  const data = board.data
  const seats = data.papers.reduce((n, p) => n + 1 + p.extras.length, 0)
  const named = data.papers.reduce((n, p) => n + (p.invigilatorId ? 1 : 0) + p.extras.filter((x) => x.invigilatorId).length, 0)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {data.draft ? `${data.draft.name} · ` : ''}{named} of {seats} invigilators named
          {data.published && data.publication && ` · published on ${new Date(data.publication.publishedAt).toLocaleDateString()}`}
        </p>
        {data.published ? (
          <Button variant="secondary" onClick={() => publish.mutate('reopen')} loading={publish.isPending}>
            <Unlock className="size-4" aria-hidden /> Reopen invigilators
          </Button>
        ) : (
          <Button onClick={() => publish.mutate('publish')} loading={publish.isPending} disabled={!data.draft || data.problems.length > 0}
            title={!data.draft ? 'Publish once the Director shares the exam draft' : data.problems.length ? 'Fix the items listed first' : undefined}>
            <Send className="size-4" aria-hidden /> Publish invigilators
          </Button>
        )}
      </div>
      {!data.draft && (
        <Card className="p-4 text-sm text-muted">
          The Director hasn't shared an exam draft yet. You can name each paper's main invigilator now: the timetable
          then keeps their papers in different sessions. Dates, rooms and any extra rooms show here once the draft is shared.
        </Card>
      )}
      {publish.isError && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage(publish.error)}</p>}
      {data.draft && !data.published && data.problems.length > 0 && (
        <details className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" open={data.problems.length <= 5}>
          <summary className="cursor-pointer font-semibold">{data.problems.length} to finish before publishing the invigilators</summary>
          <ul className="mt-1 list-disc pl-5">{data.problems.map((p, i) => <li key={`${p.code}${i}`}>{p.message}</li>)}</ul>
        </details>
      )}
      <TableCard>
        <thead className="bg-surface">
          <tr><th className={th}>Paper</th><th className={th}>When</th><th className={th}>Room</th><th className={th}>Invigilator</th></tr>
        </thead>
        <tbody>
          {data.papers.map((p) => <PaperRows key={p.paperId} term={term} board={data} paper={p} />)}
          {data.papers.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">No papers.</td></tr>}
        </tbody>
      </TableCard>
      <Duties board={data} />
    </section>
  )
}

/** The paper's main room (or, before the draft, the paper), then a line per extra room. */
function PaperRows({ term, board, paper }: { term: string | undefined; board: InvigilationBoard; paper: InvigilationRow }) {
  const noRoom = paper.placed && paper.rooms.length === 0
  return (
    <>
      <tr className={clsx('border-t border-line align-top', board.draft && !noRoom && !paper.invigilatorId && 'bg-warning-soft')}>
        <td className={td} rowSpan={1 + paper.extras.length}>
          <span className="font-semibold text-ink">{paper.codes}</span><span className="block text-xs text-muted">{paper.title}</span>
        </td>
        <td className={`${td} whitespace-nowrap`} rowSpan={1 + paper.extras.length}>{when(paper)}</td>
        <td className={`${td} text-xs`}>
          {noRoom ? <span className="text-muted">To be announced (no students known)</span> : paper.mainRoom ?? (paper.placed ? paper.rooms.join(', ') : '—')}
          {paper.extras.length > 0 && <span className="block text-muted">main</span>}
        </td>
        <td className={td}>
          <Choose term={term} board={board} paperId={paper.paperId} room="" current={paper} label={`Main invigilator for ${paper.codes}`} />
        </td>
      </tr>
      {paper.extras.map((x) => (
        <tr key={x.room} className={clsx('align-top', !x.invigilatorId && 'bg-warning-soft')}>
          <td className={`${td} text-xs`}>{x.room}<span className="block text-muted">extra</span></td>
          <td className={td}>
            <Choose term={term} board={board} paperId={paper.paperId} room={x.room} current={x} label={`Invigilator for ${paper.codes} in ${x.room}`} />
          </td>
        </tr>
      ))}
    </>
  )
}

function Choose({ term, board, paperId, room, current, label }: {
  term: string | undefined
  board: InvigilationBoard
  paperId: string
  room: string
  current: { invigilatorId: string | null; invigilator: string | null; invigilatorDepartment: string | null }
  label: string
}) {
  const save = useSetInvigilator(term)
  const [others, setOthers] = useState(Boolean(current.invigilatorDepartment && current.invigilatorDepartment !== board.department.code))
  if (!board.canEdit) return <>{current.invigilator ?? <span className="text-warning">Not named</span>}</>
  const choices = board.lecturers.filter((x) => others || x.own || x.id === current.invigilatorId)
  return (
    <div className="space-y-1">
      <select aria-label={label} value={current.invigilatorId ?? ''} disabled={save.isPending}
        onChange={(e) => save.mutate({ paperId, room, lecturerId: e.target.value || null })} className="input">
        <option value="">Not named</option>
        {choices.map((x) => (
          <option key={x.id} value={x.id}>
            {x.display}{x.own ? '' : ` · ${x.departmentCode}`} ({x.duties}{x.maxExamDuties ? ` of ${x.maxExamDuties}` : ''} duties)
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} /> Show other departments' lecturers
      </label>
      {save.isError && <p role="alert" className="text-xs text-danger">{errorMessage(save.error)}</p>}
    </div>
  )
}

/** Duties per lecturer on the department's list, across every department, so they are shared fairly. */
function Duties({ board }: { board: InvigilationBoard }) {
  const own = board.lecturers.filter((x) => x.own).sort((a, b) => b.duties - a.duties)
  if (own.length === 0) return null
  return (
    <Card className="p-0">
      <details>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">Duties per lecturer</summary>
        <ul className="grid gap-1 border-t border-line p-4 text-sm sm:grid-cols-2">
          {own.map((x) => (
            <li key={x.id} className="flex justify-between gap-3">
              <span>{x.display}</span>
              <span className={clsx(x.maxExamDuties && x.duties >= x.maxExamDuties ? 'text-warning' : 'text-muted')}>
                {x.duties}{x.maxExamDuties ? ` of ${x.maxExamDuties}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  )
}

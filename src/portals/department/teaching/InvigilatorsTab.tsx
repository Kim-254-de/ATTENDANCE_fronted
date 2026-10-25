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
  p.date ? `${new Date(`${p.date}T00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ${p.startTime}–${p.endTime}` : 'Not placed'

/**
 * Invigilators on the exam draft the Director shared: one per paper, who
 * administers it and takes the scripts away. Anyone on any department's list
 * can be named; one person is never in two places in a session.
 */
export function InvigilatorsTab({ term }: { term: string | undefined }) {
  const board = useInvigilationBoard(term)
  const publish = usePublishInvigilators(term)

  if (board.isPending) return <Skeleton className="h-40" />
  if (board.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(board.error)}</p>
  const data = board.data
  if (!data.draft) {
    return <Card className="p-6 text-sm text-muted">The Director hasn't shared an exam draft yet. Your papers' dates, sessions and rooms will show here, to name invigilators.</Card>
  }
  const named = data.papers.filter((p) => p.invigilatorId).length

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {data.draft.name} · {named} of {data.papers.length} papers have an invigilator
          {data.published && data.publication && ` · published on ${new Date(data.publication.publishedAt).toLocaleDateString()}`}
        </p>
        {data.published ? (
          <Button variant="secondary" onClick={() => publish.mutate('reopen')} loading={publish.isPending}>
            <Unlock className="size-4" aria-hidden /> Reopen invigilators
          </Button>
        ) : (
          <Button onClick={() => publish.mutate('publish')} loading={publish.isPending} disabled={data.problems.length > 0}
            title={data.problems.length ? 'Name an invigilator for every paper first' : undefined}>
            <Send className="size-4" aria-hidden /> Publish invigilators
          </Button>
        )}
      </div>
      {publish.isError && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage(publish.error)}</p>}
      <TableCard>
        <thead className="bg-surface">
          <tr><th className={th}>Paper</th><th className={th}>When</th><th className={th}>Rooms</th><th className={th}>Invigilator</th></tr>
        </thead>
        <tbody>
          {data.papers.map((p) => <Row key={p.paperId} term={term} board={data} paper={p} />)}
          {data.papers.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">No papers.</td></tr>}
        </tbody>
      </TableCard>
      <Duties board={data} />
    </section>
  )
}

function Row({ term, board, paper }: { term: string | undefined; board: InvigilationBoard; paper: InvigilationRow }) {
  const save = useSetInvigilator(term)
  const [others, setOthers] = useState(Boolean(paper.invigilatorDepartment && paper.invigilatorDepartment !== board.department.code))
  const choices = board.lecturers.filter((x) => others || x.own || x.id === paper.invigilatorId)
  return (
    <tr className={clsx('border-t border-line align-top', !paper.invigilatorId && 'bg-warning-soft')}>
      <td className={td}><span className="font-semibold text-ink">{paper.codes}</span><span className="block text-xs text-muted">{paper.title}</span></td>
      <td className={`${td} whitespace-nowrap`}>{when(paper)}</td>
      <td className={`${td} text-xs`}>{paper.rooms.join(', ')}</td>
      <td className={td}>
        {board.canEdit ? (
          <div className="space-y-1">
            <select aria-label={`Invigilator for ${paper.codes}`} value={paper.invigilatorId ?? ''} disabled={save.isPending || !paper.date}
              onChange={(e) => save.mutate({ paperId: paper.paperId, lecturerId: e.target.value || null })} className="input">
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
        ) : (
          paper.invigilator ?? <span className="text-warning">Not named</span>
        )}
      </td>
    </tr>
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

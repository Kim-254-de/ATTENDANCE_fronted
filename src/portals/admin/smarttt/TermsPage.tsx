import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import type { SmartttTerm } from '@/types'
import { Badge, Head, Notice, type Tone } from './parts'
import { useClearTermSlots, useSetCurrentTerm, useSmartttTerms } from './smartttApi'

const termName = (t: SmartttTerm) => `${t.academic_year} Semester ${t.semester}`

/**
 * SMARTTT's academic terms. The current term is the one students' and
 * lecturers' timetables (and attendance's class activation) follow; a
 * master timetable upload creates its term.
 */
export function TermsPage() {
  const terms = useSmartttTerms()
  const setCurrent = useSetCurrentTerm()
  const clearSlots = useClearTermSlots()
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  const onError = (error: unknown) => setNotice({ tone: 'error', text: errorMessage(error) })
  const makeCurrent = (t: SmartttTerm) =>
    setCurrent.mutate(t.id, { onSuccess: () => setNotice({ tone: 'success', text: `${termName(t)} is now the current term.` }), onError })
  const clear = (t: SmartttTerm) => {
    if (!window.confirm(`Delete every timetable slot of ${termName(t)}? This cannot be undone.`)) return
    clearSlots.mutate(t.id, { onSuccess: (r) => setNotice({ tone: 'success', text: r.detail ?? 'Slots cleared.' }), onError })
  }

  return (
    <div className="space-y-4">
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {terms.error ? (
        <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(terms.error, 'Could not load the terms from SMARTTT.')}</Card>
      ) : terms.isPending ? (
        <Skeleton className="h-40" />
      ) : terms.data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No terms yet. Uploading a master timetable creates its term.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <Head columns={['Term', 'Dates', 'Status', '']} />
            <tbody className="divide-y divide-line">
              {terms.data.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 font-medium text-navy-900">{termName(t)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">
                    {t.start_date ? formatShortDate(t.start_date) : '—'} – {t.end_date ? formatShortDate(t.end_date) : '—'}
                  </td>
                  <td className="px-5 py-3">{t.is_current ? <Badge tone="success">Current</Badge> : <Badge tone="muted">Not current</Badge>}</td>
                  <td className="space-x-2 whitespace-nowrap px-5 py-3 text-right">
                    {!t.is_current && (
                      <Button variant="secondary" onClick={() => makeCurrent(t)} loading={setCurrent.isPending && setCurrent.variables === t.id} disabled={setCurrent.isPending}>
                        Make current
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => clear(t)} loading={clearSlots.isPending && clearSlots.variables === t.id} aria-label={`Clear the slots of ${termName(t)}`}>
                      Clear slots
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

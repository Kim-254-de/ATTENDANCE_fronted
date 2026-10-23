import { ChevronRight, MessageSquareQuote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { usePendingEvaluationCount } from './evaluationsApi'

/**
 * Course evaluations are seasonal, so they have no tab of their own: this card shows on Home and
 * My Units only while a round is open and the student still has units to rate.
 */
export function EvaluationPrompt() {
  const pending = usePendingEvaluationCount()
  if (pending === 0) return null

  return (
    <Link to="/student-evaluations" className="block">
      <Card className="flex items-center gap-3 p-4 transition hover:shadow-md">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning"><MessageSquareQuote className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Course evaluation open</p>
          <p className="text-xs text-muted">{pending} unit{pending === 1 ? '' : 's'} to rate. Anonymous, takes a minute each.</p>
        </div>
        <ChevronRight className="size-4 text-muted" aria-hidden />
      </Card>
    </Link>
  )
}

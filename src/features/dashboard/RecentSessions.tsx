import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import type { RecentSession } from '@/types'
import { useRecentSessions } from './dashboardApi'

export function RecentSessions({ limit = 5 }: { limit?: number }) {
  const { data, isPending, error, refetch } = useRecentSessions(limit)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <h2 className="font-semibold text-navy-900">Recent Sessions</h2>
        <Link to="/attendance" className="text-sm font-semibold text-navy-900 hover:underline">View all →</Link>
      </div>

      {error ? (
        <div role="alert" className="flex items-center justify-between border-t border-line p-5 text-sm">
          <span className="text-red-700">{errorMessage(error, 'Could not load recent sessions.')}</span>
          <button onClick={() => refetch()} className="font-semibold text-navy-900 underline">Retry</button>
        </div>
      ) : isPending ? (
        <div className="space-y-2 border-t border-line p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
      ) : data.length === 0 ? (
        <p className="border-t border-line p-8 text-center text-sm text-muted">No sessions yet. Activate a class to start one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-surface/60 text-xs font-semibold tracking-wider text-muted">
                {['DATE', 'UNIT', 'PRESENT / TOTAL', 'RATE', 'REFERENCE'].map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((s) => <Row key={s.id} s={s} />)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Row({ s }: { s: RecentSession }) {
  const rate = s.total ? Math.round((s.present / s.total) * 100) : 0
  return (
    <tr>
      <td className="whitespace-nowrap px-5 py-4 text-muted">{formatShortDate(s.date)}</td>
      <td className="px-5 py-4"><span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{s.unitCode}</span></td>
      <td className="px-5 py-4"><b className="text-navy-900">{s.present}</b><span className="text-muted">/{s.total}</span></td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-12 rounded-full bg-line" role="img" aria-label={`${rate}% attendance`}>
            <div className="h-full rounded-full bg-success" style={{ width: `${rate}%` }} />
          </div>
          <span className="font-semibold text-success">{rate}%</span>
        </div>
      </td>
      <td className="px-5 py-4"><CopyRef value={s.reference} /></td>
    </tr>
  )
}

function CopyRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable (insecure context); the text stays selectable */
    }
  }
  return (
    <button onClick={copy} title="Copy reference" aria-label={`Copy reference ${value}`} className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-navy-900">
      {value}
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />}
    </button>
  )
}

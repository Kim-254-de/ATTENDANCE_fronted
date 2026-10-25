import { useMinAttendance } from '@/lib/attendancePolicy'

/** Minutes past a class's scheduled start before the officer's eye should be drawn to it. */
const LATE_MINUTES_THRESHOLD = 5
/** Beyond this, a late start stops being a rounding error and is flagged red. */
const VERY_LATE_MINUTES_THRESHOLD = 15

const formatRate = (rate: number | null) => (rate === null ? '—' : `${rate.toFixed(0)}%`)

/**
 * The lecturer dashboard's inline rate bar (see RecentSessions), shared by
 * the department portal: a track with a filled width, plus the
 * number. Anything under the exam-eligibility threshold reads amber rather
 * than green, so a column of rates can be scanned without reading any of them.
 */
export function RateBar({ rate, label }: { rate: number | null; label: string }) {
  const minimum = useMinAttendance()
  const below = rate !== null && rate < minimum
  const tone = rate === null ? 'text-muted' : below ? 'text-warning' : 'text-success'
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-line" role="img" aria-label={`${label}: ${formatRate(rate)}`}>
        <div className={`h-full rounded-full ${below ? 'bg-warning-solid' : 'bg-success-solid'}`} style={{ width: `${rate ?? 0}%` }} />
      </div>
      <span className={`text-xs font-semibold ${tone}`}>{formatRate(rate)}</span>
    </div>
  )
}

/** One session's punctuality: on time or early is green, a little late amber, badly late red. */
export function LateMinutes({ minutes }: { minutes: number | null }) {
  if (minutes === null) {
    return <span className="text-xs text-muted" title="This unit has no issued schedule to be late against">Unscheduled</span>
  }
  const tone =
    minutes < LATE_MINUTES_THRESHOLD ? 'bg-success-soft text-success'
      : minutes < VERY_LATE_MINUTES_THRESHOLD ? 'bg-warning-soft text-warning'
        : 'bg-danger-soft text-danger'
  const text = minutes === 0 ? 'On time' : minutes < 0 ? `${Math.abs(minutes)} min early` : `${minutes} min late`
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{text}</span>
}

/** A lecturer's mean lateness across their classes — the one-line footnote under their on-time rate. */
export function AvgLateMinutes({ minutes }: { minutes: number | null }) {
  if (minutes === null) return null
  return (
    <span className={`mt-1 block text-xs ${minutes >= LATE_MINUTES_THRESHOLD ? 'text-warning' : 'text-muted'}`}>
      {minutes <= 0 ? `${Math.abs(minutes).toFixed(1)} min early on average` : `${minutes.toFixed(1)} min late on average`}
    </span>
  )
}

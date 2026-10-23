import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { StudentUnit } from '@/types'
import { useMinAttendance } from '@/lib/attendancePolicy'
import { attendanceStreak, thisMonthsWeeks, thisWeeksDays, type DayAttendance, type WeekRate } from './attendanceStats'
import { formatRate, rateTone } from './StudentUnitCard'
import { useMyAttendance, useMyStudentUnits } from './studentApi'
import { useAnimated, useFirstVisit } from './useAnimated'
// Deep enough for a meaningful streak, weekly/monthly breakdown and overall rate, unlike the
// Home page's short preview fetch.
const PROGRESS_ATTENDANCE_LIMIT = 200

// Colorblind-safe categorical order (validated with the dataviz skill's contrast/CVD checker),
// skipping this app's reserved status hues (green = good standing, red = at risk). Beyond 6
// subjects, later units fold to a neutral rather than reusing a hue or inventing a 7th.
const SUBJECT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7']
const SUBJECT_FALLBACK_COLOR = 'var(--color-muted)'

/** Overall rate, streak and a per-unit/weekly/monthly breakdown — the "Progress" tab. */
export function StudentProgressPage() {
  const units = useMyStudentUnits()
  // Only units with a class list here have attendance to show progress for.
  const tracked = units.data?.filter((u) => u.onRoster) ?? []
  const attendance = useMyAttendance({ limit: PROGRESS_ATTENDANCE_LIMIT })
  const summary = attendance.data?.summary
  const records = attendance.data?.records ?? []
  const streak = attendance.data ? attendanceStreak(records) : 0
  const rate = summary?.attendanceRate ?? null
  const minimum = useMinAttendance()
  const goodStanding = rate === null || rate >= minimum

  const week = thisWeeksDays(records)
  const month = thisMonthsWeeks(records)
  const animate = useFirstVisit('student-progress')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">My Progress</h1>
        <p className="mt-2 text-sm text-muted">Track your academic attendance goals</p>
      </div>

      <Card className="flex flex-wrap items-center gap-6 p-6">
        <OverallRing rate={rate} loading={!summary} animate={animate} />
        <div className="min-w-[180px] flex-1 space-y-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${goodStanding ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
            <span className={`size-1.5 rounded-full ${goodStanding ? 'bg-success-solid' : 'bg-danger-solid'}`} aria-hidden />
            {goodStanding ? 'Good Standing' : 'At Risk'}
          </span>
          <Row label="Classes attended" value={summary ? `${summary.attended} / ${summary.sessionsHeld}` : '…'} />
          <Row label="Min required" value={`${minimum}%`} />
          <Row label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'} 🔥`} />
        </div>
      </Card>

      <section aria-labelledby="by-subject" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="by-subject" className="text-lg font-bold text-ink">By Units</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted">Min {minimum}%</span>
            <Link to="/student-units" className="text-sm font-semibold text-ink hover:underline">
              My units →
            </Link>
          </div>
        </div>
        {units.error ? (
          <Card className="p-5 text-sm text-danger" role="alert">{errorMessage(units.error, 'Could not load your units.')}</Card>
        ) : units.isPending ? (
          <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : tracked.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No units to show progress for yet.</Card>
        ) : (
          <Card className="divide-y divide-line">{tracked.map((u, i) => <SubjectRow key={u.id ?? u.code} unit={u} color={SUBJECT_COLORS[i] ?? SUBJECT_FALLBACK_COLOR} animate={animate} />)}</Card>
        )}
      </section>

      <section aria-labelledby="this-week" className="space-y-3">
        <div>
          <h2 id="this-week" className="text-lg font-bold text-ink">This Week</h2>
          <p className="text-xs text-muted">Classes attended per day</p>
        </div>
        <Card className="p-5">
          <WeekChart days={week} animate={animate} />
        </Card>
      </section>

      <section aria-labelledby="monthly-trend" className="space-y-3">
        <div>
          <h2 id="monthly-trend" className="text-lg font-bold text-ink">Monthly Trend</h2>
          <p className="text-xs text-muted">{new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
        </div>
        <Card className="p-5">
          <MonthlyTrendChart weeks={month} animate={animate} />
        </Card>
      </section>

      {streak > 0 && (
        <Card className="flex items-center gap-3 border border-line bg-brand-soft/70 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><Star className="size-5 fill-current" aria-hidden /></span>
          <div>
            <p className="font-bold text-ink">{streak}-Day Streak!</p>
            <p className="text-sm text-muted">You're on a roll — keep it going!</p>
          </div>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

/** The circular "overall" gauge — an animated meter, fill from a royal-blue gradient matching the brand colour. */
function OverallRing({ rate, loading, animate }: { rate: number | null; loading: boolean; animate: boolean }) {
  const target = rate ?? 0
  const animated = useAnimated(target, animate)
  const size = 128
  const strokeWidth = 12
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - animated / 100)

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="overallRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-600)" />
            <stop offset="100%" stopColor="var(--color-brand-400)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#overallRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <p className="text-2xl font-bold text-ink">{loading ? '…' : formatRate(rate)}</p>
        <p className="text-[11px] text-muted">overall</p>
      </div>
    </div>
  )
}

function SubjectRow({ unit, color, animate }: { unit: StudentUnit; color: string; animate: boolean }) {
  const target = unit.attendanceRate ?? 0
  const animated = useAnimated(target, animate)
  return (
    <div className="space-y-2 p-5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-ink">{unit.name ?? unit.code} <span className="font-normal text-muted">{unit.code}</span></span>
        <span className="shrink-0 text-xs text-muted">{unit.sessionsAttended}/{unit.sessionsHeld} <span className={`font-bold ${rateTone(unit.attendanceRate)}`}>{formatRate(unit.attendanceRate)}</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: `${animated}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/** Bar carries a status color — green when the day's classes were all attended, gold when some weren't, a flat track when no class was held. */
function WeekChart({ days, animate }: { days: DayAttendance[]; animate: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3">
      {days.map((d) => {
        const rate = d.held ? (d.attended / d.held) * 100 : 0
        const color = d.held === 0 ? 'var(--color-line)' : d.attended === d.held ? 'var(--color-success)' : 'var(--color-accent)'
        return <WeekBar key={d.label} label={d.label} valueLabel={d.held ? `${d.attended}/${d.held}` : '—'} rate={rate} color={color} animate={animate} />
      })}
    </div>
  )
}

function WeekBar({ label, valueLabel, rate, color, animate }: { label: string; valueLabel: string; rate: number; color: string; animate: boolean }) {
  const animated = useAnimated(rate, animate)
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="text-xs font-semibold text-ink">{valueLabel}</span>
      <div className="flex h-24 w-full items-end overflow-hidden rounded-t-md bg-surface" title={`${label}: ${valueLabel}`}>
        <div
          className="w-full rounded-t-md transition-[height] duration-700 ease-out motion-reduce:transition-none"
          style={{ height: `${Math.max(animated, 4)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

/** A single-series line — blue, per the sequential hue used across the student portal — with the latest point colored by standing (matches the Good Standing / At Risk status elsewhere on this page). */
function MonthlyTrendChart({ weeks, animate }: { weeks: WeekRate[]; animate: boolean }) {
  const width = 280
  const height = 110
  const padding = 16
  const known = weeks.filter((w) => w.rate !== null)
  const lastKnown = known.at(-1) ?? null
  const minimum = useMinAttendance()
  const atRisk = lastKnown !== null && lastKnown.rate! < minimum

  const step = weeks.length > 1 ? (width - padding * 2) / (weeks.length - 1) : 0
  const points = weeks.map((w, i) => ({
    x: padding + i * step,
    y: w.rate === null ? null : padding + (height - padding * 2) * (1 - w.rate / 100),
    week: w,
  }))
  const knownPoints = points.filter((p) => p.y !== null) as { x: number; y: number; week: WeekRate }[]
  const path = knownPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const pathLength = 1000 // arbitrary unit length; paired with matching dasharray/offset below
  const animated = useAnimated(knownPoints.length > 0 ? pathLength : 0, animate)

  if (knownPoints.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No classes recorded yet this month.</p>
  }

  const last = knownPoints.at(-1)!

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Weekly attendance rate: ${knownPoints.map((p) => `${p.week.label} ${p.week.rate}%`).join(', ')}`}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-line)" strokeWidth={1} />
      <path
        d={path}
        fill="none"
        stroke="var(--color-brand-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={pathLength}
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength - animated}
        className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
      />
      {knownPoints.map((p) => (
        <circle key={p.week.label} cx={p.x} cy={p.y} r={3} fill="var(--color-brand-ink)" stroke="var(--color-card)" strokeWidth={1.5}>
          <title>{`${p.week.label}: ${p.week.rate}%`}</title>
        </circle>
      ))}
      <circle cx={last.x} cy={last.y} r={4.5} fill={atRisk ? 'var(--color-danger)' : 'var(--color-success)'} stroke="var(--color-card)" strokeWidth={2}>
        <title>{`${last.week.label}: ${last.week.rate}%`}</title>
      </circle>
      {points.map((p) => (
        <text key={p.week.label} x={p.x} y={height - 2} textAnchor="middle" className="fill-muted text-[9px]">{p.week.label}</text>
      ))}
    </svg>
  )
}

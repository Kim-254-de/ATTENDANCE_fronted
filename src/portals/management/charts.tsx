import clsx from 'clsx'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRate } from './format'

/**
 * The management portal's two charts, drawn with plain elements rather than a
 * chart library: every mark is a link, so tapping a department, year or unit
 * opens the next level down.
 *
 * Both plot one measure, the attendance rate (0–100), in the brand hue, with
 * the exam-eligibility minimum as a reference line. A rate under it turns
 * amber and carries a warning icon, so the state never rests on colour alone.
 * A null rate (no class with a roster held yet) draws no bar and says so.
 */

const isBelow = (rate: number | null, minimum: number) => rate !== null && rate < minimum

/** The key both charts share: what the reference line and the amber bars mean. */
function Legend({ minimum }: { minimum: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-2"><span className="h-3 w-px bg-accent" aria-hidden />{minimum}% exam minimum</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-r-[3px] bg-warning-solid" aria-hidden /><AlertTriangle className="size-3 text-warning" aria-hidden />Below the minimum</span>
    </div>
  )
}

export interface RankedBarItem {
  key: string
  to: string
  label: string
  /** One muted line under the label: the counts behind the rate. */
  detail: string
  rate: number | null
}

/**
 * Horizontal bars, one row per item, in the order given (callers sort
 * highest first). Better than a pie here: a university has too many
 * departments for slices to be told apart, and the question is "which are
 * attending worst", which is a comparison of lengths.
 */
export function RankedBars({ items, minimum, label }: { items: RankedBarItem[]; minimum: number; label: string }) {
  return (
    <div role="list" aria-label={label} className="relative">
      <Legend minimum={minimum} />
      <div className="space-y-1">
        {items.map((item) => {
          const below = isBelow(item.rate, minimum)
          return (
            <Link
              key={item.key}
              to={item.to}
              role="listitem"
              aria-label={`${item.label}: ${item.rate === null ? 'no classes held yet' : `${formatRate(item.rate)} attendance`}${below ? ', below the minimum' : ''}. ${item.detail}`}
              className="group grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-x-4 gap-y-1.5 rounded-xl px-3 py-2.5 transition hover:bg-brand-soft/60 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_6rem]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink group-hover:underline">{item.label}</p>
                <p className="text-xs text-muted">{item.detail}</p>
              </div>
              <div className="relative col-span-2 row-start-2 h-4 sm:col-span-1 sm:row-start-auto" aria-hidden>
                <div className="absolute inset-y-0 left-0 right-0 my-auto h-px bg-line" />
                {item.rate !== null && (
                  <div
                    className={clsx('absolute inset-y-0 left-0 rounded-r-[4px]', below ? 'bg-warning-solid' : 'bg-brand')}
                    style={{ width: `${Math.max(item.rate, 0.5)}%` }}
                  />
                )}
                <div className="absolute -inset-y-1.5 w-px bg-accent" style={{ left: `${minimum}%` }} />
              </div>
              <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-auto sm:row-start-auto">
                {below && <AlertTriangle className="size-3.5 text-warning" aria-hidden />}
                <span className={clsx('whitespace-nowrap text-sm font-semibold tabular-nums', item.rate === null ? 'text-muted' : below ? 'text-warning' : 'text-ink')}>
                  {item.rate === null ? 'No classes' : formatRate(item.rate)}
                </span>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export interface ColumnItem {
  key: string
  to: string
  label: string
  detail: string
  rate: number | null
}

const TICKS = [0, 25, 50, 75, 100]

/** Vertical columns on a 0–100% axis: a department's Years 1–4 side by side. */
export function RateColumns({ items, minimum, label }: { items: ColumnItem[]; minimum: number; label: string }) {
  return (
    <div>
      <Legend minimum={minimum} />
      <div className="flex gap-3">
        <div className="relative h-52 w-8 shrink-0 text-right text-[11px] tabular-nums text-muted" aria-hidden>
          {TICKS.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${t}%` }}>{t}%</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-52">
            {TICKS.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${t}%` }} aria-hidden />
            ))}
            <div className="absolute inset-x-0 z-10 h-px bg-accent" style={{ bottom: `${minimum}%` }} aria-hidden />
            <div role="list" aria-label={label} className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
              {items.map((item) => {
                const below = isBelow(item.rate, minimum)
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    role="listitem"
                    aria-label={`${item.label}: ${item.rate === null ? 'no classes held yet' : `${formatRate(item.rate)} attendance`}${below ? ', below the minimum' : ''}. ${item.detail}`}
                    className="group relative mx-1 rounded-t-xl transition hover:bg-brand-soft/60"
                  >
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center" style={{ height: `${item.rate ?? 0}%` }} aria-hidden>
                      <span className={clsx('absolute -top-6 flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums', item.rate === null ? 'text-muted' : below ? 'text-warning' : 'text-ink')}>
                        {below && <AlertTriangle className="size-3.5" aria-hidden />}
                        {item.rate === null ? 'No classes' : formatRate(item.rate)}
                      </span>
                      {item.rate !== null && (
                        <div className={clsx('h-full w-6 rounded-t-[4px]', below ? 'bg-warning-solid' : 'bg-brand')} />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} aria-hidden>
            {items.map((item) => (
              <div key={item.key} className="px-1 text-center">
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="text-xs text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

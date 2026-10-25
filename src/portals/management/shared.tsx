import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'

/** Where the drill-down is: University › Department › Year › Unit, every level but the last a link back. */
export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
            {crumb.to ? (
              <Link to={crumb.to} className="font-medium text-brand-ink hover:underline">{crumb.label}</Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** The loading and error states every level shares; renders `children` only once the data is in. */
export function Loading({ error, pending, retry, what, children }: {
  error: unknown; pending: boolean; retry: () => void; what: string; children: () => ReactNode
}) {
  if (error) {
    return (
      <Card className="flex items-center justify-between p-5" role="alert">
        <p className="text-sm text-danger">{errorMessage(error, `Could not load ${what}.`)}</p>
        <button onClick={retry} className="text-sm font-semibold text-ink underline">Retry</button>
      </Card>
    )
  }
  if (pending) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72" />
      </div>
    )
  }
  return <>{children()}</>
}

/** A small headline figure: label, value, and the one line that explains it. */
export function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-tight text-ink sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  )
}

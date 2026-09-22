import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface Props {
  label: string
  value: string | number
  hint: string
  icon: LucideIcon
  accent?: boolean
}

export function StatCard({ label, value, hint, icon: Icon, accent }: Props) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', accent ? 'bg-gold-100 text-gold-600' : 'bg-navy-900/5 text-navy-800')}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className={clsx('text-3xl font-bold leading-tight', accent ? 'text-gold-500' : 'text-navy-900')}>{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </Card>
  )
}

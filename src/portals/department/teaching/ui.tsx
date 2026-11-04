import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-ink">
      <span className="block">{label}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
    </label>
  )
}

/** A table that scrolls sideways on a phone instead of the page. */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </Card>
  )
}

export const th = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted'
export const td = 'px-3 py-2'
export const linkButton = 'cursor-pointer text-sm font-semibold text-brand-ink hover:underline'
export const dangerLink = 'cursor-pointer text-sm font-semibold text-danger hover:underline'

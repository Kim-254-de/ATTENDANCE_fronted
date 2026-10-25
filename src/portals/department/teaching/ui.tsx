import clsx from 'clsx'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

/** A modal form. Escape or the close button cancels. */
export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 grid place-items-center bg-brand-950/50 p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <Card className={clsx('max-h-[90vh] w-full space-y-4 overflow-y-auto p-6', wide ? 'max-w-4xl' : 'max-w-xl')}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </Card>
    </div>
  )
}

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

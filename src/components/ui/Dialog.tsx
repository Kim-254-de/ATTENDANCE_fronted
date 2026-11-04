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

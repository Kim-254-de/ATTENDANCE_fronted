import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { cloneElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react'

/**
 * Label + input with its hint or error. Only the label text names the input; the hint/error is
 * linked through aria-describedby so screen readers announce it without it becoming the name.
 */
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactElement<InputHTMLAttributes<HTMLInputElement>>; className?: string }) {
  const id = useId()
  const note = error ?? hint
  return (
    <div className={`space-y-1.5 text-sm font-medium text-navy-900 ${className ?? ''}`}>
      <label className="block space-y-1.5">
        <span className="block">{label}</span>
        {cloneElement(children, { 'aria-invalid': error ? true : undefined, 'aria-describedby': note ? id : undefined })}
      </label>
      {error ? (
        <span id={id} role="alert" className="block text-xs font-normal text-red-600">{error}</span>
      ) : (
        hint && <span id={id} className="block text-xs font-normal text-muted">{hint}</span>
      )}
    </div>
  )
}

/**
 * Field with a leading icon (and optional trailing slot, e.g. a show/hide password button).
 * Built by hand rather than through `Field` because the icon and trailing slot need to sit
 * inside the same relative wrapper as the input, not around the label.
 */
export function IconField({
  id,
  label,
  icon: Icon,
  error,
  hint,
  trailing,
  className,
  ...inputProps
}: {
  id: string
  label: string
  icon: LucideIcon
  error?: string
  hint?: string
  trailing?: ReactNode
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  const noteId = `${id}-note`
  const note = error ?? hint
  return (
    <div className="space-y-1.5 text-sm font-medium text-navy-900">
      <label htmlFor={id} className="block">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted" aria-hidden />
        <input
          id={id}
          {...inputProps}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={clsx('input pl-10', trailing && 'pr-11', className)}
        />
        {trailing}
      </div>
      {error ? (
        <span id={noteId} role="alert" className="block text-xs font-normal text-red-600">{error}</span>
      ) : (
        hint && <span id={noteId} className="block text-xs font-normal text-muted">{hint}</span>
      )}
    </div>
  )
}

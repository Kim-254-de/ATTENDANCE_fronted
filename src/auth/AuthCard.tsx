import { cloneElement, useId, type InputHTMLAttributes, type ReactElement } from 'react'

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

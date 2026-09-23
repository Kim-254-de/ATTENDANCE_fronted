import { GraduationCap } from 'lucide-react'
import { cloneElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react'

/** The navy backdrop and white card shared by the sign-in, registration and verification screens. */
export function AuthCard({ title, subtitle, wide, children }: { title: string; subtitle: string; wide?: boolean; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy-900 p-4">
      <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'} space-y-5 rounded-2xl bg-white p-8 shadow-xl`}>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500 text-white"><GraduationCap className="size-6" aria-hidden /></span>
          <div>
            <h1 className="text-lg font-bold text-navy-900">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  )
}

/**
 * Label + input with its hint or error. Only the label text names the input; the hint/error is
 * linked through aria-describedby so screen readers announce it without it becoming the name.
 */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactElement<InputHTMLAttributes<HTMLInputElement>> }) {
  const id = useId()
  const note = error ?? hint
  return (
    <div className="space-y-1.5 text-sm font-medium text-navy-900">
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

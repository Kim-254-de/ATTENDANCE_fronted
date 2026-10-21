import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * Pieces the SMARTTT pages share: choosing and sending one file, and the
 * line that says how it went.
 */

export function FileUpload({
  label,
  accept,
  hint,
  pending,
  buttonText = 'Upload',
  onUpload,
  children,
}: {
  label: string
  /** Allowed extensions, e.g. [".csv", ".xlsx"]. */
  accept: string[]
  hint?: string
  pending: boolean
  buttonText?: string
  /** `reset` clears the chosen file once the upload went through. */
  onUpload: (file: File, reset: () => void) => void
  children?: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    if (input.current) input.current.value = ''
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!file) return
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!accept.includes(extension)) {
      setProblem(`Only ${accept.join(', ')} files are accepted.`)
      return
    }
    setProblem(null)
    onUpload(file, reset)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
        {label}
        <input
          ref={input}
          type="file"
          accept={accept.join(',')}
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setProblem(null) }}
          className="block w-full text-sm font-normal text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-900"
        />
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
      {problem && <p role="alert" className="text-sm text-red-600">{problem}</p>}
      <Button type="submit" loading={pending} disabled={!file}>
        <Upload className="size-4" aria-hidden /> {buttonText}
      </Button>
    </form>
  )
}

export type Tone = 'success' | 'warning' | 'error'

export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'rounded-lg px-3 py-2 text-sm',
        tone === 'success' && 'bg-emerald-50 text-success',
        tone === 'warning' && 'bg-orange-50 text-orange-700',
        tone === 'error' && 'bg-red-50 text-red-700',
      )}
    >
      {children}
    </p>
  )
}

export function Badge({ tone, children }: { tone: 'success' | 'warning' | 'danger' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tone === 'success' && 'bg-emerald-50 text-success',
        tone === 'warning' && 'bg-orange-50 text-orange-700',
        tone === 'danger' && 'bg-red-50 text-red-700',
        tone === 'muted' && 'bg-surface text-muted',
      )}
    >
      {children}
    </span>
  )
}

/** A table's header row, in the console's style. */
export function Head({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
        {columns.map((c, i) => (
          <th key={i} scope="col" className="px-5 py-3">{c || <span className="sr-only">Actions</span>}</th>
        ))}
      </tr>
    </thead>
  )
}

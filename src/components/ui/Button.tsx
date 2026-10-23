import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const styles: Record<Variant, string> = {
  // Royal blue in every portal, as on the SMARTTT student portal; gold is kept for highlights.
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-strong',
  secondary: 'bg-card text-ink border border-line hover:bg-surface',
  ghost: 'text-ink hover:bg-surface',
  danger: 'border border-danger-solid bg-card text-danger hover:bg-danger-solid hover:text-white',
}

export function Button({ variant = 'primary', loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className,
      )}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

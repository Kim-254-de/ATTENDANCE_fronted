import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const styles: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-gold-500 to-gold-600 text-white shadow-sm hover:brightness-105',
  secondary: 'bg-white text-navy-900 border border-line hover:bg-surface',
  ghost: 'text-navy-900 hover:bg-surface',
}

export function Button({ variant = 'primary', loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className,
      )}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

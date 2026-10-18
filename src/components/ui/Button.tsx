import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'lecturer' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const styles: Record<Variant, string> = {
  // Neutral default — shared, role-agnostic surfaces (error boundaries, retry buttons) that render
  // before a role is even known.
  primary: 'bg-gradient-to-b from-gold-500 to-gold-600 text-white shadow-sm hover:brightness-105',
  secondary: 'bg-white text-navy-900 border border-line hover:bg-surface',
  ghost: 'text-navy-900 hover:bg-surface',
  // Used by the student portal, which favours blue over the site-wide gold accent.
  accent: 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-sm hover:brightness-105',
  // The lecturer portal's primary action colour, matching the university's own portal (green Sign In).
  lecturer: 'bg-gradient-to-b from-green-600 to-green-700 text-white shadow-sm hover:brightness-105',
  danger: 'border border-red-600 bg-white text-red-600 hover:bg-red-600 hover:text-white',
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

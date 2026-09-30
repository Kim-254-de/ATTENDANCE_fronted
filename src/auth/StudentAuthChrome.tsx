import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'

/** Underlined Sign In / Register switcher shown above the student login and register forms. */
export function StudentAuthTabs({ active }: { active: 'signin' | 'register' }) {
  return (
    <div className="mb-8 flex gap-8 border-b border-line text-base font-semibold">
      <Link
        to="/login?role=student"
        replace
        aria-current={active === 'signin' ? 'page' : undefined}
        className={clsx(
          '-mb-px border-b-2 pb-3 transition',
          active === 'signin' ? 'border-blue-700 text-blue-700' : 'border-transparent text-muted hover:text-navy-900',
        )}
      >
        Sign In
      </Link>
      <Link
        to="/signup?role=student"
        replace
        aria-current={active === 'register' ? 'page' : undefined}
        className={clsx(
          '-mb-px border-b-2 pb-3 transition',
          active === 'register' ? 'border-blue-700 text-blue-700' : 'border-transparent text-muted hover:text-navy-900',
        )}
      >
        Register
      </Link>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  )
}

function MicrosoftGlyph() {
  return (
    <svg viewBox="0 0 23 23" className="size-4" aria-hidden>
      <rect width="10" height="10" x="1" y="1" fill="#F25022" />
      <rect width="10" height="10" x="12" y="1" fill="#7FBA00" />
      <rect width="10" height="10" x="1" y="12" fill="#00A4EF" />
      <rect width="10" height="10" x="12" y="12" fill="#FFB900" />
    </svg>
  )
}

/** "or continue with" divider plus Google/Microsoft buttons. Neither provider is wired up yet. */
export function SocialSignIn() {
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 text-xs font-medium text-muted">
        <div className="h-px flex-1 bg-line" aria-hidden />
        or continue with
        <div className="h-px flex-1 bg-line" aria-hidden />
      </div>
      {notice && <p role="status" className="text-center text-xs text-muted">{notice}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setNotice('Google sign-in is coming soon.')}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-navy-900 transition hover:bg-surface"
        >
          <GoogleGlyph /> Google
        </button>
        <button
          type="button"
          onClick={() => setNotice('Microsoft sign-in is coming soon.')}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-navy-900 transition hover:bg-surface"
        >
          <MicrosoftGlyph /> Microsoft
        </button>
      </div>
    </div>
  )
}

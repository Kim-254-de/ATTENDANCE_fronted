import clsx from 'clsx'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useThemePreference, type ThemePreference } from '@/lib/theme'

// The icon shows what a tap switches to, not the current choice: System → Dark → Light → System.
const NEXT: Record<ThemePreference, ThemePreference> = { dark: 'light', light: 'system', system: 'dark' }
const ICON = { dark: Moon, light: Sun, system: Laptop }
const LABEL = { dark: 'Dark', light: 'Light', system: 'System' }

/** Sits left of the avatar in every portal header. System follows the device; Dark and Light override it on this browser. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useThemePreference()
  const next = NEXT[theme]
  const Icon = ICON[next]
  const label = `Switch to ${LABEL[next]} theme (now ${LABEL[theme]})`
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={clsx('grid size-10 shrink-0 place-items-center rounded-full transition', className ?? 'text-muted hover:bg-surface hover:text-ink')}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}

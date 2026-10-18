import { useEffect, useState } from 'react'

/**
 * Animates from 0 to `target` on mount (and whenever `target` changes, e.g. once data loads) —
 * paired with a CSS `transition` on whatever property reads this value. Pass `animate: false`
 * (see `useFirstVisit`) to skip straight to `target` with no animation.
 */
export function useAnimated(target: number, animate = true) {
  const [value, setValue] = useState(animate ? 0 : target)
  useEffect(() => {
    if (!animate) {
      setValue(target)
      return
    }
    const id = requestAnimationFrame(() => setValue(target))
    return () => cancelAnimationFrame(id)
  }, [target, animate])
  return value
}

// Keys that have finished their intro animation at least once this session. Module-scoped so it
// survives navigating away and back to the same page within the app; only resets on a full reload.
const settled = new Set<string>()
// Long enough that a StrictMode dev double-mount (mount → unmount → remount, all synchronous)
// never marks a key settled from the phantom mount — only a mount that's still alive after this
// delay counts, so the real first visit still gets its animation.
const SETTLE_MS = 1100

/**
 * True only on a page/section's genuine first visit this session (per `key`); false on every
 * later visit, so re-opening a page lands straight at its settled state instead of replaying the
 * intro. Call once per page and thread the result into every `useAnimated` call there.
 */
export function useFirstVisit(key: string): boolean {
  const isFirst = !settled.has(key)
  useEffect(() => {
    const id = setTimeout(() => settled.add(key), SETTLE_MS)
    return () => clearTimeout(id)
  }, [key])
  return isFirst
}
